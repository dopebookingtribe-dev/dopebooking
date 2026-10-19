import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
import { IMAGE_TYPES } from "./constants";

export const BUCKET = "public-media";

export type MediaOwnerKind = "artist" | "event" | "gallery" | "video";
export type ImageResult = { ok: true } | { ok: false; message: string };

type Client = SupabaseClient<Database>;

const OWNER_COLUMN = {
  artist: "artist_id",
  event: "event_id",
  gallery: "gallery_id",
  video: "video_id",
} as const;

/** Storage folder for an owner, e.g. "galleries/<id>". */
export function mediaFolder(kind: MediaOwnerKind, ownerId: string) {
  const plural = kind === "gallery" ? "galleries" : `${kind}s`;
  return `${plural}/${ownerId}`;
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value));

export const registerImageSchema = z.object({
  path: z.string().min(1).max(300),
  alt_text: z
    .string()
    .trim()
    .min(1, "Describe the photo for screen readers.")
    .max(300),
  credit: optionalText(120),
  width: z.number().int().positive().max(20000),
  height: z.number().int().positive().max(20000),
});

export type RegisterImageInput = z.input<typeof registerImageSchema>;

/** Sets the owner's lead image (portrait/cover/poster). */
async function setLeadImage(
  supabase: Client,
  kind: MediaOwnerKind,
  ownerId: string,
  assetId: string,
  onlyIfEmpty: boolean,
) {
  switch (kind) {
    case "artist": {
      const query = supabase
        .from("artists")
        .update({ portrait_asset_id: assetId })
        .eq("id", ownerId);
      return onlyIfEmpty ? query.is("portrait_asset_id", null) : query;
    }
    case "event": {
      const query = supabase
        .from("events")
        .update({ cover_asset_id: assetId })
        .eq("id", ownerId);
      return onlyIfEmpty ? query.is("cover_asset_id", null) : query;
    }
    case "gallery": {
      const query = supabase
        .from("galleries")
        .update({ cover_asset_id: assetId })
        .eq("id", ownerId);
      return onlyIfEmpty ? query.is("cover_asset_id", null) : query;
    }
    case "video": {
      const query = supabase
        .from("videos")
        .update({ poster_asset_id: assetId })
        .eq("id", ownerId);
      return onlyIfEmpty ? query.is("poster_asset_id", null) : query;
    }
  }
}

/**
 * Records an image the browser already uploaded to Storage, after checking
 * it sits in the owner's folder and really is an image. The first image
 * becomes the owner's lead image.
 */
export async function registerOwnedImage(
  supabase: Client,
  userId: string,
  kind: MediaOwnerKind,
  ownerId: string,
  input: RegisterImageInput,
): Promise<ImageResult> {
  const parsed = registerImageSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid image.",
    };
  }
  const { path, ...image } = parsed.data;

  const folder = `${mediaFolder(kind, ownerId)}/`;
  if (!path.startsWith(folder) || path.includes("..")) {
    return { ok: false, message: "Invalid upload path." };
  }
  const { data: info, error: infoError } = await supabase.storage
    .from(BUCKET)
    .info(path);
  const contentType = info?.contentType ?? info?.metadata?.mimetype;
  if (
    infoError ||
    !(IMAGE_TYPES as readonly string[]).includes(String(contentType))
  ) {
    return { ok: false, message: "Upload not found or not an image." };
  }

  const column = OWNER_COLUMN[kind];
  const { count } = await supabase
    .from("media_assets")
    .select("id", { count: "exact", head: true })
    .eq(column, ownerId);

  const { data: asset, error } = await supabase
    .from("media_assets")
    .insert({
      [column]: ownerId,
      storage_bucket: BUCKET,
      storage_path: path,
      sort_order: count ?? 0,
      created_by: userId,
      ...image,
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: "Could not save the photo." };

  await setLeadImage(supabase, kind, ownerId, asset.id, true);
  return { ok: true };
}

export async function makeLeadImage(
  supabase: Client,
  kind: MediaOwnerKind,
  ownerId: string,
  assetId: string,
) {
  const { data: asset } = await supabase
    .from("media_assets")
    .select("id")
    .eq("id", assetId)
    .eq(OWNER_COLUMN[kind], ownerId)
    .maybeSingle();
  if (!asset) return false;
  await setLeadImage(supabase, kind, ownerId, asset.id, false);
  return true;
}

/** Deletes the record (lead-image FKs clear themselves), then the file. */
export async function deleteOwnedImage(
  supabase: Client,
  kind: MediaOwnerKind,
  ownerId: string,
  assetId: string,
) {
  const { data: asset } = await supabase
    .from("media_assets")
    .select("id, storage_bucket, storage_path")
    .eq("id", assetId)
    .eq(OWNER_COLUMN[kind], ownerId)
    .maybeSingle();
  if (!asset) return false;

  const { error } = await supabase
    .from("media_assets")
    .delete()
    .eq("id", asset.id);
  if (error) return false;
  await supabase.storage
    .from(asset.storage_bucket)
    .remove([asset.storage_path]);
  return true;
}

export const MEDIA_COLUMNS =
  "id, storage_bucket, storage_path, alt_text, credit, width, height, sort_order";
