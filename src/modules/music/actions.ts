"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import {
  failedForm,
  invalidForm,
  savedForm,
  slugTakenForm,
  type FormState,
} from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import {
  deleteOwnedImage,
  makeLeadImage,
  registerOwnedImage,
  type ImageResult,
  type RegisterImageInput,
} from "@/modules/media/server";
import { MUSIC_TAG } from "./queries";
import {
  amountSchema,
  createReleaseSchema,
  FILE_FORMATS,
  formatOfFile,
  MAX_MASTER_BYTES,
  MAX_PREVIEW_BYTES,
  MUSIC_CURRENCY,
  payoutDetailsSchema,
  releaseDetailsSchema,
  trackSchema,
} from "./schemas";

type Result = { ok: true } | { ok: false; message: string };

const MASTERS = "music-masters";
const PREVIEWS = "music-previews";
const UUID = /^[0-9a-f-]{36}$/i;

/** The release, if the signed-in user may see it (a team member or staff). */
async function loadRelease(releaseId: string) {
  const user = await requireUser(`/dashboard/music/${releaseId}`);
  if (!UUID.test(releaseId)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("music_releases")
    .select("id, artist_id, slug, title, status, release_type")
    .eq("id", releaseId)
    .maybeSingle();
  return data ? { user, supabase, release: data } : null;
}

async function loadTrack(trackId: string) {
  const user = await requireUser("/dashboard/music");
  if (!UUID.test(trackId)) return null;
  const supabase = await createClient();
  const { data: track } = await supabase
    .from("music_tracks")
    .select("id, release_id, position, preview_path")
    .eq("id", trackId)
    .maybeSingle();
  return track ? { user, supabase, track } : null;
}

/** Turns a database refusal into words for the artist. */
function refusal(error: { code?: string; message: string }): {
  ok: false;
  message: string;
} {
  const minimum = /^The minimum withdrawal is (\d+) cents$/.exec(error.message);
  if (minimum) {
    return {
      ok: false,
      message: `The minimum withdrawal is €${(Number(minimum[1]) / 100).toFixed(2)}.`,
    };
  }
  if (["42501", "22023", "23514"].includes(error.code ?? "")) {
    return { ok: false, message: error.message };
  }
  return { ok: false, message: "Saving failed. Please try again." };
}

function refusalForm(
  error: { code?: string; message: string },
  formData: FormData,
): FormState {
  return { ...failedForm(formData), message: refusal(error).message };
}

const isEditable = (status: string) =>
  ["draft", "rejected", "archived"].includes(status);

// ---------------------------------------------------------------------------
// Releases
// ---------------------------------------------------------------------------

export async function createRelease(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser("/dashboard/music/new");
  const parsed = createReleaseSchema.safeParse(Object.fromEntries(formData));
  const artistId = String(formData.get("artist_id") ?? "");
  if (!parsed.success) return invalidForm(parsed.error, formData);
  if (!UUID.test(artistId)) {
    return { ...failedForm(formData), message: "Choose an artist profile." };
  }

  const supabase = await createClient();
  // RLS allows the insert only for the artist's own team (or music staff).
  let releaseId: string | null = null;
  for (let attempt = 0; attempt < 6 && !releaseId; attempt++) {
    const slug =
      attempt === 0
        ? parsed.data.slug
        : `${parsed.data.slug.slice(0, 80)}-${attempt < 3 ? attempt + 1 : Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await supabase
      .from("music_releases")
      .insert({
        artist_id: artistId,
        slug,
        title: parsed.data.title,
        release_type: parsed.data.release_type,
        currency: MUSIC_CURRENCY,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (data) releaseId = data.id;
    else if (error?.code !== "23505") return failedForm(formData);
  }
  if (!releaseId) return failedForm(formData);
  redirect(`/dashboard/music/${releaseId}`);
}

export async function updateRelease(
  releaseId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const found = await loadRelease(releaseId);
  if (!found) return failedForm(formData);
  const { supabase, release } = found;

  // A live release keeps its identity: only price, text and availability change.
  if (release.status === "published") {
    const parsed = releaseDetailsSchema
      .pick({
        description: true,
        credits: true,
        price_amount: true,
        on_sale: true,
      })
      .safeParse(Object.fromEntries(formData));
    if (!parsed.success) return invalidForm(parsed.error, formData);
    const { error } = await supabase
      .from("music_releases")
      .update(parsed.data)
      .eq("id", releaseId);
    if (error) return refusalForm(error, formData);
    updateTag(MUSIC_TAG);
    return savedForm(formData);
  }

  const parsed = releaseDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);
  const values = parsed.data;
  if (values.subgenre_id) {
    const { data: subgenre } = await supabase
      .from("music_genres")
      .select("parent_id")
      .eq("id", values.subgenre_id)
      .maybeSingle();
    if (!subgenre || subgenre.parent_id !== values.genre_id) {
      return {
        ...failedForm(formData),
        message: undefined,
        fieldErrors: { subgenre_id: ["Pick a style of the chosen genre."] },
      };
    }
  }

  const { error } = await supabase
    .from("music_releases")
    .update(values)
    .eq("id", releaseId);
  if (error?.code === "23505") return slugTakenForm(formData);
  if (error) return refusalForm(error, formData);
  updateTag(MUSIC_TAG);
  return savedForm(formData);
}

/** Deletes a draft with its files. Releases that ever sold are kept. */
export async function deleteRelease(releaseId: string): Promise<Result> {
  const found = await loadRelease(releaseId);
  if (!found) return { ok: false, message: "Release not found." };
  const { supabase, release } = found;
  if (!["draft", "rejected"].includes(release.status)) {
    return { ok: false, message: "Only drafts can be deleted." };
  }
  const { count: sold } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("music_release_id", releaseId);
  if (sold) {
    return {
      ok: false,
      message: "This release has orders, so it stays. Unpublish it instead.",
    };
  }

  const { data: tracks } = await supabase
    .from("music_tracks")
    .select("id, preview_path")
    .eq("release_id", releaseId);
  const trackIds = (tracks ?? []).map((track) => track.id);
  const { data: files } = trackIds.length
    ? await supabase
        .from("music_track_files")
        .select("storage_path")
        .in("track_id", trackIds)
    : { data: [] };
  const { data: covers } = await supabase
    .from("media_assets")
    .select("id")
    .eq("music_release_id", releaseId);

  const { error } = await supabase
    .from("music_releases")
    .delete()
    .eq("id", releaseId)
    .in("status", ["draft", "rejected"]);
  if (error) return refusal(error);

  // Rows are gone (cascade); clear the stored objects too.
  const masters = (files ?? []).map((file) => file.storage_path);
  const previews = (tracks ?? []).flatMap((track) =>
    track.preview_path ? [track.preview_path] : [],
  );
  if (masters.length) await supabase.storage.from(MASTERS).remove(masters);
  if (previews.length) await supabase.storage.from(PREVIEWS).remove(previews);
  for (const cover of covers ?? []) {
    await deleteOwnedImage(supabase, "music", releaseId, cover.id);
  }
  redirect("/dashboard/music?deleted=1");
}

/** A release has one cover: a new upload replaces the old one. */
export async function registerReleaseCover(
  releaseId: string,
  input: RegisterImageInput,
): Promise<ImageResult> {
  const found = await loadRelease(releaseId);
  if (!found) return { ok: false, message: "Release not found." };
  const { user, supabase, release } = found;
  if (!isEditable(release.status)) {
    return { ok: false, message: "Unpublish the release to change its cover." };
  }
  const { data: old } = await supabase
    .from("media_assets")
    .select("id")
    .eq("music_release_id", releaseId);
  const result = await registerOwnedImage(
    supabase,
    user.id,
    "music",
    releaseId,
    input,
  );
  if (!result.ok) return result;
  const { data: latest } = await supabase
    .from("media_assets")
    .select("id")
    .eq("music_release_id", releaseId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (latest) await makeLeadImage(supabase, "music", releaseId, latest.id);
  for (const previous of old ?? []) {
    await deleteOwnedImage(supabase, "music", releaseId, previous.id);
  }
  return result;
}

const submitSchema = z.object({
  rights: z.literal("on", { message: "Confirm that you hold the rights." }),
  terms: z.literal("on", { message: "Accept the music seller terms." }),
});

export async function submitRelease(
  releaseId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const found = await loadRelease(releaseId);
  if (!found) return failedForm(formData);
  const parsed = submitSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);
  const { error } = await found.supabase.rpc("submit_music_release", {
    p_release: releaseId,
    p_rights_confirmed: true,
  });
  if (error) return refusalForm(error, formData);
  return {
    status: "success",
    message: "Sent for review. We'll let you know when it's live.",
  };
}

/** Back to draft: from review (to edit) or from "needs changes". */
export async function returnToDraft(releaseId: string): Promise<Result> {
  const found = await loadRelease(releaseId);
  if (!found) return { ok: false, message: "Release not found." };
  const { error } = await found.supabase
    .from("music_releases")
    .update({ status: "draft" })
    .eq("id", releaseId)
    .in("status", ["in_review", "rejected", "archived"]);
  return error ? refusal(error) : { ok: true };
}

/** Takes a live release off the store. Past buyers keep their downloads. */
export async function unpublishRelease(releaseId: string): Promise<Result> {
  const found = await loadRelease(releaseId);
  if (!found) return { ok: false, message: "Release not found." };
  const { error } = await found.supabase
    .from("music_releases")
    .update({ status: "archived" })
    .eq("id", releaseId)
    .eq("status", "published");
  if (error) return refusal(error);
  updateTag(MUSIC_TAG);
  return { ok: true };
}

export async function saveBundleItems(
  releaseId: string,
  releaseIds: string[],
): Promise<Result> {
  const found = await loadRelease(releaseId);
  if (!found) return { ok: false, message: "Release not found." };
  const { supabase, release } = found;
  if (release.release_type !== "bundle") {
    return { ok: false, message: "Only bundles hold other releases." };
  }
  const ids = [...new Set(releaseIds.filter((id) => UUID.test(id)))].slice(
    0,
    50,
  );
  const { error: clearError } = await supabase
    .from("music_bundle_items")
    .delete()
    .eq("bundle_id", releaseId);
  if (clearError) return refusal(clearError);
  if (ids.length) {
    const { error } = await supabase.from("music_bundle_items").insert(
      ids.map((id, index) => ({
        bundle_id: releaseId,
        release_id: id,
        sort_order: index,
      })),
    );
    if (error) return refusal(error);
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Tracks, masters and previews
// ---------------------------------------------------------------------------

const durationSchema = z.number().int().min(1).max(21600).nullable();

export async function createTrack(
  releaseId: string,
  input: { title: string; duration: number | null },
): Promise<{ ok: true; trackId: string } | { ok: false; message: string }> {
  const found = await loadRelease(releaseId);
  if (!found) return { ok: false, message: "Release not found." };
  const { supabase, release } = found;
  if (release.release_type === "bundle") {
    return { ok: false, message: "Bundles hold releases, not tracks." };
  }
  if (!isEditable(release.status)) {
    return { ok: false, message: "Return the release to draft to add tracks." };
  }
  const title = input.title.trim().slice(0, 160) || "Untitled";
  const duration = durationSchema.safeParse(
    input.duration === null ? null : Math.round(input.duration),
  );
  const { data: last } = await supabase
    .from("music_tracks")
    .select("position")
    .eq("release_id", releaseId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (last?.position ?? 0) + 1;
  if (position > 200)
    return { ok: false, message: "A release holds up to 200 tracks." };

  const { data, error } = await supabase
    .from("music_tracks")
    .insert({
      release_id: releaseId,
      position,
      title,
      duration_seconds: duration.success ? duration.data : null,
    })
    .select("id")
    .single();
  if (error || !data)
    return error ? refusal(error) : { ok: false, message: "Saving failed." };
  return { ok: true, trackId: data.id };
}

export async function updateTrack(
  trackId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const found = await loadTrack(trackId);
  if (!found) return failedForm(formData);
  const parsed = trackSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);
  const { error } = await found.supabase
    .from("music_tracks")
    .update(parsed.data)
    .eq("id", trackId);
  if (error) return refusalForm(error, formData);
  return savedForm(formData);
}

export async function deleteTrack(trackId: string): Promise<Result> {
  const found = await loadTrack(trackId);
  if (!found) return { ok: false, message: "Track not found." };
  const { supabase, track } = found;
  const { data: files } = await supabase
    .from("music_track_files")
    .select("storage_path")
    .eq("track_id", trackId);
  const { error } = await supabase
    .from("music_tracks")
    .delete()
    .eq("id", trackId);
  if (error) return refusal(error);
  const masters = (files ?? []).map((file) => file.storage_path);
  if (masters.length) await supabase.storage.from(MASTERS).remove(masters);
  if (track.preview_path) {
    await supabase.storage.from(PREVIEWS).remove([track.preview_path]);
  }
  // Close the gap in the running order.
  const { data: rest } = await supabase
    .from("music_tracks")
    .select("id, position")
    .eq("release_id", track.release_id)
    .order("position");
  for (const [index, row] of (rest ?? []).entries()) {
    if (row.position !== index + 1) {
      await supabase
        .from("music_tracks")
        .update({ position: index + 1 })
        .eq("id", row.id);
    }
  }
  return { ok: true };
}

export async function moveTrack(
  trackId: string,
  direction: -1 | 1,
): Promise<Result> {
  const found = await loadTrack(trackId);
  if (!found) return { ok: false, message: "Track not found." };
  const { supabase, track } = found;
  const { data: neighbour } = await supabase
    .from("music_tracks")
    .select("id, position")
    .eq("release_id", track.release_id)
    .eq("position", track.position + direction)
    .maybeSingle();
  if (!neighbour) return { ok: true };
  const first = await supabase
    .from("music_tracks")
    .update({ position: neighbour.position })
    .eq("id", track.id);
  if (first.error) return refusal(first.error);
  const second = await supabase
    .from("music_tracks")
    .update({ position: track.position })
    .eq("id", neighbour.id);
  return second.error ? refusal(second.error) : { ok: true };
}

function ownsPath(path: string, releaseId: string, trackId: string) {
  return (
    path.startsWith(`releases/${releaseId}/${trackId}/`) &&
    !path.includes("..") &&
    path.length <= 300
  );
}

/**
 * Records a master the browser uploaded to the private bucket, after
 * checking where it sits, its type and size. A second file of the same
 * format replaces the first.
 */
export async function registerTrackFile(
  trackId: string,
  input: { path: string },
): Promise<Result> {
  const found = await loadTrack(trackId);
  if (!found) return { ok: false, message: "Track not found." };
  const { supabase, track } = found;
  if (!ownsPath(input.path, track.release_id, trackId)) {
    return { ok: false, message: "Invalid upload path." };
  }
  const { data: info, error: infoError } = await supabase.storage
    .from(MASTERS)
    .info(input.path);
  const type = String(info?.contentType ?? info?.metadata?.mimetype ?? "");
  const format = formatOfFile({ name: input.path, type });
  if (
    infoError ||
    !info?.size ||
    !format ||
    !FILE_FORMATS[format].mime.includes(type)
  ) {
    return {
      ok: false,
      message: "Upload not found or not a WAV, FLAC, MP3 or AIFF file.",
    };
  }
  if (info.size > MAX_MASTER_BYTES) {
    await supabase.storage.from(MASTERS).remove([input.path]);
    return {
      ok: false,
      message: "That file is over 50 MB. Try FLAC instead of WAV.",
    };
  }

  const { data: existing } = await supabase
    .from("music_track_files")
    .select("id, storage_path")
    .eq("track_id", trackId)
    .eq("format", format)
    .maybeSingle();
  const { error } = existing
    ? await supabase
        .from("music_track_files")
        .update({ storage_path: input.path, size_bytes: info.size })
        .eq("id", existing.id)
    : await supabase.from("music_track_files").insert({
        track_id: trackId,
        format,
        storage_path: input.path,
        size_bytes: info.size,
      });
  if (error) return refusal(error);
  if (existing && existing.storage_path !== input.path) {
    await supabase.storage.from(MASTERS).remove([existing.storage_path]);
  }
  return { ok: true };
}

export async function deleteTrackFile(fileId: string): Promise<Result> {
  await requireUser("/dashboard/music");
  if (!UUID.test(fileId)) return { ok: false, message: "File not found." };
  const supabase = await createClient();
  const { data: file } = await supabase
    .from("music_track_files")
    .select("id, storage_path")
    .eq("id", fileId)
    .maybeSingle();
  if (!file) return { ok: false, message: "File not found." };
  const { error } = await supabase
    .from("music_track_files")
    .delete()
    .eq("id", file.id);
  if (error) return refusal(error);
  await supabase.storage.from(MASTERS).remove([file.storage_path]);
  return { ok: true };
}

/** Records the short public clip made in the browser from the master. */
export async function registerTrackPreview(
  trackId: string,
  input: { path: string; duration: number | null },
): Promise<Result> {
  const found = await loadTrack(trackId);
  if (!found) return { ok: false, message: "Track not found." };
  const { supabase, track } = found;
  if (!ownsPath(input.path, track.release_id, trackId)) {
    return { ok: false, message: "Invalid upload path." };
  }
  const { data: info, error: infoError } = await supabase.storage
    .from(PREVIEWS)
    .info(input.path);
  if (infoError || !info?.size || info.size > MAX_PREVIEW_BYTES) {
    return { ok: false, message: "Preview upload not found." };
  }
  const duration = durationSchema.safeParse(
    input.duration === null ? null : Math.round(input.duration),
  );
  const { error } = await supabase
    .from("music_tracks")
    .update({
      preview_path: input.path,
      ...(duration.success && duration.data
        ? { duration_seconds: duration.data }
        : {}),
    })
    .eq("id", trackId);
  if (error) return refusal(error);
  if (track.preview_path && track.preview_path !== input.path) {
    await supabase.storage.from(PREVIEWS).remove([track.preview_path]);
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Earnings: payout details and withdrawals
// ---------------------------------------------------------------------------

export async function savePayoutDetails(
  artistId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser("/dashboard/music/earnings");
  if (!UUID.test(artistId)) return failedForm(formData);
  const parsed = payoutDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);
  const supabase = await createClient();
  // RLS limits this to the artist's own team.
  const { error } = await supabase
    .from("artist_payout_details")
    .upsert({ artist_id: artistId, ...parsed.data, updated_by: user.id });
  if (error) return failedForm(formData);
  return savedForm(formData);
}

export async function requestWithdrawal(
  artistId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser("/dashboard/music/earnings");
  if (!UUID.test(artistId)) return failedForm(formData);
  const parsed = amountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_withdrawal", {
    p_artist: artistId,
    p_amount: parsed.data.amount!,
  });
  if (error) return refusalForm(error, formData);
  return {
    status: "success",
    message: "Withdrawal requested. We'll confirm when it's paid.",
  };
}

export async function cancelWithdrawal(withdrawalId: string): Promise<Result> {
  await requireUser("/dashboard/music/earnings");
  if (!UUID.test(withdrawalId)) return { ok: false, message: "Not found." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_withdrawal", {
    p_withdrawal: withdrawalId,
  });
  return error ? refusal(error) : { ok: true };
}
