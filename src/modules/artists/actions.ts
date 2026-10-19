"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { requireRole, STAFF_ROLES } from "@/lib/auth/dal";
import { fieldErrorsOf, formValues, type FormState } from "@/lib/forms";
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
