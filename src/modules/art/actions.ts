"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import {
  failedForm,
  formValues,
  invalidForm,
  savedForm,
  slugTakenForm,
  type FormState,
} from "@/lib/forms";
import type {
  ArtCollection,
  ContentStatus,
} from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import {
  deleteOwnedImage,
  makeLeadImage,
  registerOwnedImage,
  type ImageResult,
  type MediaOwnerKind,
  type RegisterImageInput,
} from "@/modules/media/server";
import { VIDEOS_TAG } from "@/modules/videos/queries";
import { ART_TAG } from "./queries";
import {
  artArtistDetailsSchema,
  artExhibitionDetailsSchema,
  artLinksSchema,
  artworkDetailsSchema,
  COLLECTIONS,
  createArtArtistSchema,
  createArtExhibitionSchema,
  createArtworkSchema,
  creditsSchema,
  festivalSchema,
  idListSchema,
  membersSchema,
  participantsSchema,
  partnersSchema,
} from "./schemas";

/*
 * Art Gallery admin actions. Every action re-checks content.manage on the
 * server; RLS enforces the same permission in the database.
 */

type Kind = "artist" | "exhibition" | "artwork";

const PATHS: Record<Kind, string> = {
  artist: "/admin/art/artists",
  exhibition: "/admin/art/exhibitions",
  artwork: "/admin/art/artworks",
};
const TABLES = {
  artist: "art_artists",
  exhibition: "art_exhibitions",
  artwork: "art_artworks",
} as const;
const OWNER: Record<Kind, MediaOwnerKind> = {
  artist: "art-artist",
  exhibition: "art-exhibition",
  artwork: "art-artwork",
};

async function editor(path: string) {
  const { user } = await requirePermission("content.manage", path);
  return { user, supabase: await createClient() };
}

function refresh() {
  updateTag(ART_TAG);
}

const listError = (
  formData: FormData,
  multi: string[],
  message: string,
): FormState => ({
  status: "error",
  message,
  values: formValues(formData, multi),
});

function firstIssue(
  error: { issues: { path: PropertyKey[]; message: string }[] },
  noun: string,
) {
  const issue = error.issues[0];
  const index = issue?.path[0];
  return typeof index === "number"
    ? `${noun} ${index + 1}: ${issue.message}`
    : (issue?.message ?? "Please check the list.");
}

// ---------------------------------------------------------------------------
// Create, status, delete (shared)
// ---------------------------------------------------------------------------

export async function createArtArtist(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user, supabase } = await editor(PATHS.artist);
  const parsed = createArtArtistSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);
  const { data, error } = await supabase
    .from("art_artists")
    .insert({ ...parsed.data, created_by: user.id })
    .select("id")
    .single();
  if (error?.code === "23505") return slugTakenForm(formData);
  if (error) return failedForm(formData);
  redirect(`${PATHS.artist}/${data.id}`);
}

export async function createArtExhibition(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user, supabase } = await editor(PATHS.exhibition);
  const parsed = createArtExhibitionSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) return invalidForm(parsed.error, formData);
  const { data, error } = await supabase
    .from("art_exhibitions")
    .insert({ ...parsed.data, created_by: user.id })
    .select("id")
    .single();
  if (error?.code === "23505") return slugTakenForm(formData);
  if (error) return failedForm(formData);
  redirect(`${PATHS.exhibition}/${data.id}`);
}

export async function createArtwork(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user, supabase } = await editor(PATHS.artwork);
  const parsed = createArtworkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);
  const { data, error } = await supabase
    .from("art_artworks")
    .insert({ ...parsed.data, created_by: user.id })
    .select("id")
    .single();
  if (error?.code === "23505") return slugTakenForm(formData);
  if (error) return failedForm(formData);
  // Starting from an artist's page pre-credits them.
  const artist = String(formData.get("artist_id") ?? "");
  if (/^[0-9a-f-]{36}$/i.test(artist)) {
    await supabase
      .from("art_artwork_credits")
      .insert({ artwork_id: data.id, art_artist_id: artist });
  }
  redirect(`${PATHS.artwork}/${data.id}`);
}

/** Publish, unpublish (back to draft) or archive in one click. */
export async function setArtStatus(
  kind: Kind,
  id: string,
  status: ContentStatus,
) {
  const { supabase } = await editor(`${PATHS[kind]}/${id}`);
  await supabase.from(TABLES[kind]).update({ status }).eq("id", id);
  refresh();
}

export async function deleteArtItem(
  kind: Kind,
  id: string,
): Promise<FormState> {
  const { supabase } = await editor(`${PATHS[kind]}/${id}`);
  const column = {
    artist: "art_artist_id",
    exhibition: "art_exhibition_id",
    artwork: "art_artwork_id",
  }[kind];
  const { data: media } = await supabase
    .from("media_assets")
    .select("storage_bucket, storage_path")
    .eq(column, id);
  const { error, count } = await supabase
    .from(TABLES[kind])
    .delete({ count: "exact" })
    .eq("id", id);
  if (error || !count) {
    return { status: "error", message: "Deleting failed. Archive it instead." };
  }
  const paths = (media ?? []).map((row) => row.storage_path);
  if (paths.length) await supabase.storage.from("public-media").remove(paths);
  refresh();
  redirect(PATHS[kind]);
}

// ---------------------------------------------------------------------------
// Artists
// ---------------------------------------------------------------------------

export async function updateArtArtistDetails(
  artistId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await editor(`${PATHS.artist}/${artistId}`);
  const multi = ["disciplines"];
  const parsed = artArtistDetailsSchema.safeParse({
    ...Object.fromEntries(formData),
    disciplines: formData.getAll("disciplines"),
  });
  if (!parsed.success) return invalidForm(parsed.error, formData, multi);
  const { error } = await supabase
    .from("art_artists")
    .update(parsed.data)
    .eq("id", artistId);
  if (error?.code === "23505") return slugTakenForm(formData, multi);
  if (error?.code === "23514" && /collective/i.test(error.message)) {
    return listError(
      formData,
      multi,
      "Remove collective members before changing the profile type.",
    );
  }
  if (error) return failedForm(formData, multi);
  refresh();
  return savedForm(formData, multi);
}

export async function saveArtArtistLinks(
  artistId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await editor(`${PATHS.artist}/${artistId}`);
  const multi = ["platform", "url"];
  const platforms = formData.getAll("platform").map(String);
  const urls = formData.getAll("url").map((value) => String(value).trim());
  const rows = platforms
    .map((platform, index) => ({ platform, url: urls[index] ?? "" }))
    .filter((row) => row.url !== "");
  const parsed = artLinksSchema.safeParse(rows);
  if (!parsed.success)
    return listError(formData, multi, firstIssue(parsed.error, "Link"));

  const { error: deleteError } = await supabase
    .from("art_artist_links")
    .delete()
    .eq("art_artist_id", artistId);
  if (deleteError) return failedForm(formData, multi);
  if (parsed.data.length) {
    const { error } = await supabase.from("art_artist_links").insert(
      parsed.data.map((link, index) => ({
        art_artist_id: artistId,
        ...link,
        sort_order: index,
      })),
    );
    if (error?.code === "23505")
      return listError(formData, multi, "The same link is listed twice.");
    if (error) return failedForm(formData, multi);
  }
  refresh();
  return { status: "success", message: "Links saved." };
}

export async function saveCollectiveMembers(
  collectiveId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await editor(`${PATHS.artist}/${collectiveId}`);
  const multi = ["member_id", "note"];
  const ids = formData.getAll("member_id").map(String);
  const notes = formData.getAll("note").map(String);
  const rows = ids
    .map((member_id, index) => ({ member_id, note: notes[index] ?? "" }))
    .filter((row) => row.member_id !== "");
  const parsed = membersSchema.safeParse(rows);
  if (!parsed.success)
    return listError(formData, multi, firstIssue(parsed.error, "Member"));

  const { error: deleteError } = await supabase
    .from("art_collective_members")
    .delete()
    .eq("collective_id", collectiveId);
  if (deleteError) return failedForm(formData, multi);
  if (parsed.data.length) {
    const { error } = await supabase.from("art_collective_members").insert(
      parsed.data.map((row, index) => ({
        collective_id: collectiveId,
        ...row,
        sort_order: index,
      })),
    );
    if (error?.code === "23514") {
      return listError(
        formData,
        multi,
        "Only individual artists can be members, and only of a collective.",
      );
    }
    if (error) return failedForm(formData, multi);
  }
  refresh();
  return { status: "success", message: "Members saved." };
}

export async function setArtArtistCover(
  artistId: string,
  assetId: string | null,
) {
  const { supabase } = await editor(`${PATHS.artist}/${artistId}`);
  if (assetId) {
    const { data } = await supabase
      .from("media_assets")
      .select("id")
      .eq("id", assetId)
      .eq("art_artist_id", artistId)
      .maybeSingle();
    if (!data) return;
  }
  await supabase
    .from("art_artists")
    .update({ cover_asset_id: assetId })
    .eq("id", artistId);
  refresh();
}

// ---------------------------------------------------------------------------
// Images (shared)
// ---------------------------------------------------------------------------

export async function registerArtImage(
  kind: Kind,
  ownerId: string,
  input: RegisterImageInput,
): Promise<ImageResult> {
  const { user, supabase } = await editor(`${PATHS[kind]}/${ownerId}`);
  const result = await registerOwnedImage(
    supabase,
    user.id,
    OWNER[kind],
    ownerId,
    input,
  );
  if (result.ok) refresh();
  return result;
}

/** Exhibition photo with its curated set chosen at upload. */
export async function registerExhibitionPhoto(
  exhibitionId: string,
  collection: ArtCollection | null,
  input: RegisterImageInput,
): Promise<ImageResult> {
  const { user, supabase } = await editor(
    `${PATHS.exhibition}/${exhibitionId}`,
  );
  const safe = collection && collection in COLLECTIONS ? collection : null;
  const result = await registerOwnedImage(
    supabase,
    user.id,
    "art-exhibition",
    exhibitionId,
    input,
    {
      // Logos and set photos never become the cover by accident.
      lead: safe === null,
      extra: safe ? { art_collection: safe } : {},
    },
  );
  if (result.ok) refresh();
  return result;
}

export async function makeArtLeadImage(
  kind: Kind,
  ownerId: string,
  assetId: string,
) {
  const { supabase } = await editor(`${PATHS[kind]}/${ownerId}`);
  if (await makeLeadImage(supabase, OWNER[kind], ownerId, assetId)) refresh();
}

export async function deleteArtImage(
  kind: Kind,
  ownerId: string,
  assetId: string,
) {
  const { supabase } = await editor(`${PATHS[kind]}/${ownerId}`);
  if (await deleteOwnedImage(supabase, OWNER[kind], ownerId, assetId))
    refresh();
}

export async function setExhibitionMobileCover(
  exhibitionId: string,
  assetId: string | null,
) {
  const { supabase } = await editor(`${PATHS.exhibition}/${exhibitionId}`);
  if (assetId) {
    const { data } = await supabase
      .from("media_assets")
      .select("id")
      .eq("id", assetId)
      .eq("art_exhibition_id", exhibitionId)
      .maybeSingle();
    if (!data) return;
  }
  await supabase
    .from("art_exhibitions")
    .update({ mobile_cover_asset_id: assetId })
    .eq("id", exhibitionId);
  refresh();
}

/** Moves an exhibition photo to another curated set (or none). */
export async function setPhotoCollection(
  exhibitionId: string,
  assetId: string,
  formData: FormData,
) {
  const { supabase } = await editor(`${PATHS.exhibition}/${exhibitionId}`);
  const value = String(formData.get("collection") ?? "");
  const collection = value in COLLECTIONS ? (value as ArtCollection) : null;
  await supabase
    .from("media_assets")
    .update({ art_collection: collection })
    .eq("id", assetId)
    .eq("art_exhibition_id", exhibitionId);
  refresh();
}

// ---------------------------------------------------------------------------
// Exhibitions
// ---------------------------------------------------------------------------

export async function updateArtExhibitionDetails(
  exhibitionId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await editor(`${PATHS.exhibition}/${exhibitionId}`);
  const parsed = artExhibitionDetailsSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) return invalidForm(parsed.error, formData);
  const { error } = await supabase
    .from("art_exhibitions")
    .update(parsed.data)
    .eq("id", exhibitionId);
  if (error?.code === "23505") return slugTakenForm(formData);
  if (error) return failedForm(formData);
  refresh();
  return savedForm(formData);
}

export async function saveExhibitionParticipants(
  exhibitionId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await editor(`${PATHS.exhibition}/${exhibitionId}`);
  const ids = formData.getAll("art_artist_id").map(String);
  const notes = formData.getAll("note").map(String);
  // Each row posts its roles as "roles.<row index>".
  const rows = ids
    .map((art_artist_id, index) => ({
      art_artist_id,
      roles: formData
        .getAll(`roles.${formData.getAll("row")[index]}`)
        .map(String),
      note: notes[index] ?? "",
    }))
    .filter((row) => row.art_artist_id !== "");
  const multi = ["art_artist_id", "note", "row"];
  const parsed = participantsSchema.safeParse(rows);
  if (!parsed.success)
    return listError(formData, multi, firstIssue(parsed.error, "Artist"));

  const { error: deleteError } = await supabase
    .from("art_exhibition_artists")
    .delete()
    .eq("exhibition_id", exhibitionId);
  if (deleteError) return failedForm(formData, multi);
  if (parsed.data.length) {
    const { error } = await supabase.from("art_exhibition_artists").insert(
      parsed.data.map((row, index) => ({
        exhibition_id: exhibitionId,
        ...row,
        sort_order: index,
      })),
    );
    if (error) return failedForm(formData, multi);
  }
  refresh();
  return { status: "success", message: "Artists saved." };
}

export async function saveExhibitionArtworks(
  exhibitionId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await editor(`${PATHS.exhibition}/${exhibitionId}`);
  const parsed = idListSchema.safeParse(
    formData.getAll("artwork_id").map(String).filter(Boolean),
  );
  if (!parsed.success)
    return { status: "error", message: "Choose artworks from the list." };
  const { error: deleteError } = await supabase
    .from("art_exhibition_artworks")
    .delete()
    .eq("exhibition_id", exhibitionId);
  if (deleteError)
    return { status: "error", message: "Saving failed. Please try again." };
  if (parsed.data.length) {
    const { error } = await supabase.from("art_exhibition_artworks").insert(
      parsed.data.map((artwork_id, index) => ({
        exhibition_id: exhibitionId,
        artwork_id,
        sort_order: index,
      })),
    );
    if (error)
      return { status: "error", message: "Saving failed. Please try again." };
  }
  refresh();
  return { status: "success", message: "Collection saved." };
}

export async function saveExhibitionPartners(
  exhibitionId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await editor(`${PATHS.exhibition}/${exhibitionId}`);
  const multi = ["name", "kind", "url", "logo_asset_id"];
  const names = formData.getAll("name").map(String);
  const kinds = formData.getAll("kind").map(String);
  const urls = formData.getAll("url").map(String);
  const logos = formData.getAll("logo_asset_id").map(String);
  const rows = names
    .map((name, index) => ({
      name,
      kind: kinds[index] ?? "partner",
      url: urls[index] ?? "",
      logo_asset_id: logos[index] ?? "",
    }))
    .filter((row) => row.name.trim() !== "");
  const parsed = partnersSchema.safeParse(rows);
  if (!parsed.success)
    return listError(formData, multi, firstIssue(parsed.error, "Partner"));

  // Logos must be this exhibition's own images.
  const logoIds = parsed.data
    .map((row) => row.logo_asset_id)
    .filter((id): id is string => !!id);
  if (logoIds.length) {
    const { data } = await supabase
      .from("media_assets")
      .select("id")
      .eq("art_exhibition_id", exhibitionId)
      .in("id", logoIds);
    const own = new Set((data ?? []).map((row) => row.id));
    if (logoIds.some((id) => !own.has(id))) {
      return listError(
        formData,
        multi,
        "Choose logos uploaded to this exhibition.",
      );
    }
  }
  const { error: deleteError } = await supabase
    .from("art_exhibition_partners")
    .delete()
    .eq("exhibition_id", exhibitionId);
  if (deleteError) return failedForm(formData, multi);
  if (parsed.data.length) {
    const { error } = await supabase.from("art_exhibition_partners").insert(
      parsed.data.map((row, index) => ({
        exhibition_id: exhibitionId,
        ...row,
        sort_order: index,
      })),
    );
    if (error) return failedForm(formData, multi);
  }
  refresh();
  return { status: "success", message: "Partners saved." };
}

// ---------------------------------------------------------------------------
// Artworks
// ---------------------------------------------------------------------------

export async function updateArtworkDetails(
  artworkId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await editor(`${PATHS.artwork}/${artworkId}`);
  const parsed = artworkDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);
  const { error } = await supabase
    .from("art_artworks")
    .update(parsed.data)
    .eq("id", artworkId);
  if (error?.code === "23505") return slugTakenForm(formData);
  if (error) return failedForm(formData);
  refresh();
  return savedForm(formData);
}

export async function saveArtworkCredits(
  artworkId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await editor(`${PATHS.artwork}/${artworkId}`);
  const multi = ["art_artist_id", "credit"];
  const ids = formData.getAll("art_artist_id").map(String);
  const credits = formData.getAll("credit").map(String);
  const rows = ids
    .map((art_artist_id, index) => ({
      art_artist_id,
      credit: credits[index] ?? "",
    }))
    .filter((row) => row.art_artist_id !== "");
  const parsed = creditsSchema.safeParse(rows);
  if (!parsed.success)
    return listError(formData, multi, firstIssue(parsed.error, "Credit"));

  const { error: deleteError } = await supabase
    .from("art_artwork_credits")
    .delete()
    .eq("artwork_id", artworkId);
  if (deleteError) return failedForm(formData, multi);
  const { error } = await supabase.from("art_artwork_credits").insert(
    parsed.data.map((row, index) => ({
      artwork_id: artworkId,
      ...row,
      sort_order: index,
    })),
  );
  if (error) return failedForm(formData, multi);
  refresh();
  return { status: "success", message: "Credits saved." };
}

export async function saveArtworkExhibitions(
  artworkId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await editor(`${PATHS.artwork}/${artworkId}`);
  const parsed = idListSchema.safeParse(
    formData.getAll("exhibition_id").map(String),
  );
  if (!parsed.success)
    return { status: "error", message: "Choose exhibitions from the list." };
  const { data: current } = await supabase
    .from("art_exhibition_artworks")
    .select("exhibition_id")
    .eq("artwork_id", artworkId);
  const keep = new Set(parsed.data);
  const existing = new Set((current ?? []).map((row) => row.exhibition_id));
  const removed = [...existing].filter((id) => !keep.has(id));
  const added = parsed.data.filter((id) => !existing.has(id));
  if (removed.length) {
    await supabase
      .from("art_exhibition_artworks")
      .delete()
      .eq("artwork_id", artworkId)
      .in("exhibition_id", removed);
  }
  if (added.length) {
    // New shows list the work last; reorder it on the exhibition.
    const { error } = await supabase.from("art_exhibition_artworks").insert(
      added.map((exhibition_id) => ({
        exhibition_id,
        artwork_id: artworkId,
        sort_order: 999,
      })),
    );
    if (error)
      return { status: "error", message: "Saving failed. Please try again." };
  }
  refresh();
  return { status: "success", message: "Exhibitions saved." };
}

// ---------------------------------------------------------------------------
// Videos: link an existing video (Admin → Videos) to a profile or show
// ---------------------------------------------------------------------------

export async function linkArtVideo(
  kind: "artist" | "exhibition",
  ownerId: string,
  formData: FormData,
) {
  const { supabase } = await editor(`${PATHS[kind]}/${ownerId}`);
  const videoId = String(formData.get("video_id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(videoId)) return;
  await supabase
    .from("videos")
    .update(
      kind === "artist"
        ? { art_artist_id: ownerId }
        : { art_exhibition_id: ownerId },
    )
    .eq("id", videoId);
  refresh();
  updateTag(VIDEOS_TAG);
}

export async function unlinkArtVideo(
  kind: "artist" | "exhibition",
  ownerId: string,
  videoId: string,
) {
  const { supabase } = await editor(`${PATHS[kind]}/${ownerId}`);
  const column = kind === "artist" ? "art_artist_id" : "art_exhibition_id";
  await supabase
    .from("videos")
    .update(
      kind === "artist" ? { art_artist_id: null } : { art_exhibition_id: null },
    )
    .eq("id", videoId)
    .eq(column, ownerId);
  refresh();
  updateTag(VIDEOS_TAG);
}

// ---------------------------------------------------------------------------
// Festivals
// ---------------------------------------------------------------------------

export async function saveFestival(
  festivalId: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await editor("/admin/art/festivals");
  const parsed = festivalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);
  const { error } = festivalId
    ? await supabase
        .from("art_festivals")
        .update(parsed.data)
        .eq("id", festivalId)
    : await supabase.from("art_festivals").insert(parsed.data);
  if (error?.code === "23505") return slugTakenForm(formData);
  if (error) return failedForm(formData);
  refresh();
  if (!festivalId) redirect("/admin/art/festivals");
  return savedForm(formData);
}

export async function deleteFestival(festivalId: string): Promise<FormState> {
  const { supabase } = await editor(`/admin/art/festivals/${festivalId}`);
  const { error } = await supabase
    .from("art_festivals")
    .delete()
    .eq("id", festivalId);
  if (error)
    return { status: "error", message: "Deleting failed. Please try again." };
  refresh();
  redirect("/admin/art/festivals");
}

// ---------------------------------------------------------------------------
// Featured order
// ---------------------------------------------------------------------------

export async function saveFeaturedOrder(
  kind: Kind,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await editor("/admin/art/order");
  const parsed = idListSchema.safeParse(formData.getAll("id").map(String));
  if (!parsed.success)
    return { status: "error", message: "The list could not be read." };
  const results = await Promise.all(
    parsed.data.map((id, index) =>
      supabase.from(TABLES[kind]).update({ sort_order: index }).eq("id", id),
    ),
  );
  if (results.some((result) => result.error)) {
    return { status: "error", message: "Saving failed. Please try again." };
  }
  refresh();
  return { status: "success", message: "Order saved." };
}
