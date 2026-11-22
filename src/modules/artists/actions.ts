"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole, STAFF_ROLES } from "@/lib/auth/dal";
import { requirePermission } from "@/lib/auth/permissions";
import { fieldErrorsOf, formValues, type FormState } from "@/lib/forms";
import {
  isMissingSchema,
  MIGRATION_NOTICE,
} from "@/lib/supabase/schema-errors";
import { createClient } from "@/lib/supabase/server";
import {
  deleteOwnedImage,
  makeLeadImage,
  registerOwnedImage,
  type ImageResult,
  type RegisterImageInput,
} from "@/modules/media/server";
import { ARTISTS_TAG } from "./queries";
import {
  artistDetailsSchema,
  artistLinksSchema,
  artistPrivateSchema,
  createArtistSchema,
} from "./schemas";

async function staffClient(artistId?: string) {
  const path = artistId ? `/admin/artists/${artistId}` : "/admin/artists";
  const user = await requireRole(STAFF_ROLES, path);
  return { user, supabase: await createClient() };
}

function invalid(error: z.ZodError, formData: FormData, multi?: string[]) {
  return {
    status: "error",
    fieldErrors: fieldErrorsOf(error),
    values: formValues(formData, multi),
  } satisfies FormState;
}

const failed = (formData: FormData, multi?: string[]): FormState => ({
  status: "error",
  message: "Saving failed. Please try again.",
  values: formValues(formData, multi),
});

const slugTaken = (formData: FormData, multi?: string[]): FormState => ({
  status: "error",
  fieldErrors: { slug: ["Another artist already uses this URL."] },
  values: formValues(formData, multi),
});

export async function createArtist(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user, supabase } = await staffClient();
  const parsed = createArtistSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);

  const { data, error } = await supabase
    .from("artists")
    .insert({ ...parsed.data, created_by: user.id })
    .select("id")
    .single();
  if (error?.code === "23505") return slugTaken(formData);
  if (error) return failed(formData);

  redirect(`/admin/artists/${data.id}`);
}

export async function updateArtistDetails(
  artistId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await staffClient(artistId);
  const multi = ["genres"];
  const parsed = artistDetailsSchema.safeParse({
    ...Object.fromEntries(formData),
    genres: formData.getAll("genres"),
  });
  if (!parsed.success) return invalid(parsed.error, formData, multi);

  const { error } = await supabase
    .from("artists")
    .update(parsed.data)
    .eq("id", artistId);
  if (error?.code === "23505") return slugTaken(formData, multi);
  if (error) return failed(formData, multi);

  updateTag(ARTISTS_TAG);
  return {
    status: "success",
    message: "Saved.",
    values: formValues(formData, multi),
  };
}

export async function updateArtistPrivate(
  artistId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await staffClient(artistId);
  const parsed = artistPrivateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, formData);

  const { error } = await supabase
    .from("artist_private")
    .upsert({ artist_id: artistId, ...parsed.data });
  if (error) return failed(formData);

  // Private info is never cached publicly, so no tag to refresh.
  return { status: "success", message: "Saved.", values: formValues(formData) };
}

export async function saveArtistLinks(
  artistId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await staffClient(artistId);
  const platforms = formData.getAll("platform").map(String);
  const urls = formData.getAll("url").map((value) => String(value).trim());
  const rows = platforms
    .map((platform, index) => ({ platform, url: urls[index] ?? "" }))
    .filter((row) => row.url !== "");

  const parsed = artistLinksSchema.safeParse(rows);
  if (!parsed.success) {
    const index = parsed.error.issues[0]?.path[0];
    return {
      status: "error",
      message:
        typeof index === "number"
          ? `Link ${index + 1}: ${parsed.error.issues[0].message}`
          : parsed.error.issues[0]?.message,
      values: formValues(formData, ["platform", "url"]),
    };
  }

  // Replace the whole set; links are few and order matters.
  const { error: deleteError } = await supabase
    .from("artist_links")
    .delete()
    .eq("artist_id", artistId);
  if (deleteError) return failed(formData, ["platform", "url"]);

  if (parsed.data.length) {
    const { error } = await supabase.from("artist_links").insert(
      parsed.data.map((link, index) => ({
        artist_id: artistId,
        ...link,
        sort_order: index,
      })),
    );
    if (error?.code === "23505") {
      return {
        status: "error",
        message: "The same link is listed twice.",
        values: formValues(formData, ["platform", "url"]),
      };
    }
    if (error) return failed(formData, ["platform", "url"]);
  }

  updateTag(ARTISTS_TAG);
  return { status: "success", message: "Links saved." };
}

export async function registerArtistImage(
  artistId: string,
  input: RegisterImageInput,
): Promise<ImageResult> {
  const { user, supabase } = await staffClient(artistId);
  const result = await registerOwnedImage(
    supabase,
    user.id,
    "artist",
    artistId,
    input,
  );
  if (result.ok) updateTag(ARTISTS_TAG);
  return result;
}

export async function setArtistCover(artistId: string, assetId: string) {
  const { supabase } = await staffClient(artistId);
  const { data: asset } = await supabase
    .from("media_assets")
    .select("id")
    .eq("id", assetId)
    .eq("artist_id", artistId)
    .maybeSingle();
  if (!asset) return;
  await supabase
    .from("artists")
    .update({ cover_asset_id: asset.id })
    .eq("id", artistId);
  updateTag(ARTISTS_TAG);
}

/**
 * Deletes an artist and their photos. The database only lets super admins
 * delete, and refuses when booking requests exist (archive those instead).
 */
export async function deleteArtist(artistId: string): Promise<FormState> {
  await requirePermission("content.manage", `/admin/artists/${artistId}`);
  const supabase = await createClient();
  const { data: media } = await supabase
    .from("media_assets")
    .select("storage_bucket, storage_path")
    .eq("artist_id", artistId);
  const { error, count } = await supabase
    .from("artists")
    .delete({ count: "exact" })
    .eq("id", artistId);
  if (error?.code === "23503") {
    return {
      status: "error",
      message:
        "This artist has booking requests. Set the status to Archived instead.",
    };
  }
  if (error || !count) {
    return {
      status: "error",
      message: "Only super admins can delete artists. Archive instead.",
    };
  }
  const paths = (media ?? []).map((row) => row.storage_path);
  if (paths.length) await supabase.storage.from("public-media").remove(paths);
  updateTag(ARTISTS_TAG);
  redirect("/admin/artists");
}

export async function setArtistPortrait(artistId: string, assetId: string) {
  const { supabase } = await staffClient(artistId);
  if (await makeLeadImage(supabase, "artist", artistId, assetId)) {
    updateTag(ARTISTS_TAG);
  }
}

export async function deleteArtistImage(artistId: string, assetId: string) {
  const { supabase } = await staffClient(artistId);
  if (await deleteOwnedImage(supabase, "artist", artistId, assetId)) {
    updateTag(ARTISTS_TAG);
  }
}

// ---------------------------------------------------------------------------
// Availability and press kit (migration 20261122000100)
// ---------------------------------------------------------------------------

const availabilitySchema = z
  .object({
    starts_on: z.iso.date("Choose the first day."),
    ends_on: z.iso.date("Choose the last day."),
    status: z.enum(["available", "touring", "booked", "unavailable"]),
    location: z
      .string()
      .trim()
      .max(120)
      .transform((v) => v || null),
    note: z
      .string()
      .trim()
      .max(300)
      .transform((v) => v || null),
    is_public: z
      .literal("on")
      .optional()
      .transform((v) => v === "on"),
  })
  .refine((v) => v.ends_on >= v.starts_on, {
    path: ["ends_on"],
    message: "The last day can't be before the first.",
  })
  .refine(
    (v) => (Date.parse(v.ends_on) - Date.parse(v.starts_on)) / 86400000 <= 366,
    { path: ["ends_on"], message: "Keep one window under a year." },
  );

export async function addAvailability(
  artistId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user } = await requirePermission(
    "content.manage",
    `/admin/artists/${artistId}`,
  );
  const parsed = availabilitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrorsOf(parsed.error),
      values: formValues(formData),
    };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("artist_availability")
    .insert({ artist_id: artistId, ...parsed.data, created_by: user.id });
  if (error) {
    return {
      status: "error",
      message: isMissingSchema(error)
        ? MIGRATION_NOTICE
        : "Saving failed. Please try again.",
    };
  }
  updateTag(ARTISTS_TAG);
  return { status: "success", message: "Added." };
}

export async function deleteAvailability(artistId: string, id: string) {
  await requirePermission("content.manage", `/admin/artists/${artistId}`);
  const supabase = await createClient();
  await supabase
    .from("artist_availability")
    .delete()
    .eq("id", id)
    .eq("artist_id", artistId);
  updateTag(ARTISTS_TAG);
}

export async function toggleAvailabilityPublic(
  artistId: string,
  id: string,
  isPublic: boolean,
) {
  await requirePermission("content.manage", `/admin/artists/${artistId}`);
  const supabase = await createClient();
  await supabase
    .from("artist_availability")
    .update({ is_public: isPublic })
    .eq("id", id)
    .eq("artist_id", artistId);
  updateTag(ARTISTS_TAG);
}

/** Links a PDF from the media library as the artist's press kit (or none). */
export async function setArtistPressKit(
  artistId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePermission("content.manage", `/admin/artists/${artistId}`);
  const value = String(formData.get("press_kit_asset_id") ?? "");
  const supabase = await createClient();
  if (value) {
    const { data: doc } = await supabase
      .from("media_assets")
      .select("id")
      .eq("id", value)
      .eq("type", "document")
      .not("library", "is", null)
      .maybeSingle();
    if (!doc)
      return {
        status: "error",
        message: "Choose a PDF from the media library.",
      };
  }
  const { error } = await supabase
    .from("artists")
    .update({ press_kit_asset_id: value || null })
    .eq("id", artistId);
  if (error) {
    return {
      status: "error",
      message: isMissingSchema(error)
        ? MIGRATION_NOTICE
        : "Saving failed. Please try again.",
    };
  }
  updateTag(ARTISTS_TAG);
  return {
    status: "success",
    message: value ? "Press kit saved." : "Press kit removed.",
  };
}
