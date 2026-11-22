"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import {
  isMissingSchema,
  MIGRATION_NOTICE,
} from "@/lib/supabase/schema-errors";
import { createClient } from "@/lib/supabase/server";
import { ARTISTS_TAG } from "@/modules/artists/queries";
import { MEDIA_TAG, SETTINGS_TAG } from "@/modules/cms/queries";
import { EVENTS_TAG } from "@/modules/events/queries";
import { GALLERIES_TAG } from "@/modules/galleries/queries";
import { SHOP_TAG } from "@/modules/marketplace/queries";
import { POSTS_TAG } from "@/modules/posts/queries";
import { VIDEOS_TAG } from "@/modules/videos/queries";
import {
  isMediaKind,
  kindOfMime,
  MEDIA_KINDS,
  type MediaKind,
} from "./constants";
import { getLibraryUsage, requireMediaEditor } from "./library-server";

export type LibraryResult =
  { ok: true; id: string; message?: string } | { ok: false; message: string };

export type DetailsResult = {
  ok: boolean;
  message: string;
  at?: string;
} | null;

const UUID = z.uuid();

/** Every public cache that can show a library file. */
function refreshPublicMedia() {
  for (const tag of [
    MEDIA_TAG,
    SETTINGS_TAG,
    ARTISTS_TAG,
    EVENTS_TAG,
    GALLERIES_TAG,
    VIDEOS_TAG,
    SHOP_TAG,
    POSTS_TAG,
  ]) {
    updateTag(tag);
  }
}

const fileSchema = z.object({
  path: z.string().min(1).max(300),
  kind: z.string().refine(isMediaKind, "Unknown file type."),
  original_name: z.string().trim().max(200).optional(),
  width: z.number().int().positive().max(20000).nullish(),
  height: z.number().int().positive().max(20000).nullish(),
  duration_seconds: z.number().int().min(0).max(86400).nullish(),
});

const registerSchema = fileSchema.extend({
  alt_text: z
    .string()
    .trim()
    .min(1, "Give the file a title or description.")
    .max(300),
  credit: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => (value ? value : null)),
});

export type RegisterFileInput = z.input<typeof registerSchema>;
export type ReplaceFileInput = z.input<typeof fileSchema>;

/**
 * Confirms an upload sits in the kind's library folder and really is that
 * kind of file within its size limit (the bucket enforces the same).
 */
async function verifyObject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  kind: MediaKind,
  path: string,
) {
  const rule = MEDIA_KINDS[kind];
  if (!path.startsWith(`library/${rule.folder}/`) || path.includes("..")) {
    return { ok: false as const, message: "Invalid upload path." };
  }
  const { data: info, error } = await supabase.storage
    .from(rule.bucket)
    .info(path);
  const mime = String(info?.contentType ?? info?.metadata?.mimetype ?? "");
  const size = Number(info?.size ?? info?.metadata?.size ?? 0);
  if (error || kindOfMime(mime) !== kind) {
    return {
      ok: false as const,
      message: "Upload not found or not the right type of file.",
    };
  }
  if (size > rule.maxBytes) {
    await supabase.storage.from(rule.bucket).remove([path]);
    return { ok: false as const, message: "The file is too large." };
  }
  return { ok: true as const, mime, size, bucket: rule.bucket };
}

export async function registerLibraryFile(
  input: RegisterFileInput,
): Promise<LibraryResult> {
  const { user } = await requireMediaEditor();
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid file.",
    };
  }
  const data = parsed.data;
  const kind = data.kind as MediaKind;
  const supabase = await createClient();
  const object = await verifyObject(supabase, kind, data.path);
  if (!object.ok) return object;

  const base = {
    library: "site" as const,
    type: kind,
    storage_bucket: object.bucket,
    storage_path: data.path,
    alt_text: data.alt_text,
    credit: data.credit,
    width: data.width ?? null,
    height: data.height ?? null,
    created_by: user.id,
  };
  let { data: asset, error } = await supabase
    .from("media_assets")
    .insert({
      ...base,
      mime_type: object.mime,
      size_bytes: object.size,
      original_name: data.original_name ?? null,
      duration_seconds: data.duration_seconds ?? null,
    })
    .select("id")
    .single();
  if (isMissingSchema(error) && kind === "image") {
    // Before the migration, images still save without the file details.
    ({ data: asset, error } = await supabase
      .from("media_assets")
      .insert(base)
      .select("id")
      .single());
  }
  if (error || !asset) {
    await supabase.storage.from(object.bucket).remove([data.path]);
    const message =
      isMissingSchema(error) || error?.code === "22P02"
        ? MIGRATION_NOTICE
        : "Could not save the file.";
    return { ok: false, message };
  }
  updateTag(MEDIA_TAG);
  return { ok: true, id: asset.id };
}

const detailsSchema = z.object({
  alt_text: z
    .string()
    .trim()
    .min(1, "Give the file a title or description.")
    .max(300),
  credit: z
    .string()
    .trim()
    .max(120)
    .transform((value) => (value === "" ? null : value)),
  focal_x: z.coerce.number().int().min(0).max(100).optional(),
  focal_y: z.coerce.number().int().min(0).max(100).optional(),
});

export async function updateLibraryFile(
  id: string,
  _prev: DetailsResult,
  formData: FormData,
): Promise<DetailsResult> {
  await requireMediaEditor();
  if (!UUID.safeParse(id).success)
    return { ok: false, message: "Unknown file." };
  const parsed = detailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the fields.",
    };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("media_assets")
    .update(parsed.data)
    .eq("id", id)
    .select("id");
  if (error || !data?.length)
    return { ok: false, message: "Saving failed. Please try again." };
  refreshPublicMedia();
  return { ok: true, message: "Saved.", at: new Date().toISOString() };
}

/**
 * Swaps the file behind a library item for a new upload of the same kind.
 * The id stays the same, so every page, post and video using it shows the
 * new file at once. The old file is removed afterwards.
 */
export async function replaceLibraryFile(
  id: string,
  input: ReplaceFileInput,
): Promise<LibraryResult> {
  await requireMediaEditor();
  if (!UUID.safeParse(id).success)
    return { ok: false, message: "Unknown file." };
  const parsed = fileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid file.",
    };
  }
  const supabase = await createClient();
  const { data: current } = await supabase
    .from("media_assets")
    .select("id, type, storage_bucket, storage_path, library")
    .eq("id", id)
    .maybeSingle();
  const kind = parsed.data.kind as MediaKind;
  if (!current || !current.library)
    return { ok: false, message: "File not found." };
  if (current.type !== kind) {
    return {
      ok: false,
      message: `Replace a ${MEDIA_KINDS[current.type as MediaKind]?.label.toLowerCase() ?? "file"} with the same kind of file.`,
    };
  }
  const object = await verifyObject(supabase, kind, parsed.data.path);
  if (!object.ok) return object;

  const base = {
    storage_bucket: object.bucket,
    storage_path: parsed.data.path,
    width: parsed.data.width ?? null,
    height: parsed.data.height ?? null,
  };
  let { error } = await supabase
    .from("media_assets")
    .update({
      ...base,
      mime_type: object.mime,
      size_bytes: object.size,
      original_name: parsed.data.original_name ?? null,
      duration_seconds: parsed.data.duration_seconds ?? null,
    })
    .eq("id", id);
  if (isMissingSchema(error) && kind === "image") {
    ({ error } = await supabase.from("media_assets").update(base).eq("id", id));
  }
  if (error) {
    await supabase.storage.from(object.bucket).remove([parsed.data.path]);
    return { ok: false, message: "Could not replace the file." };
  }
  await supabase.storage
    .from(current.storage_bucket)
    .remove([current.storage_path]);
  refreshPublicMedia();
  return { ok: true, id, message: "File replaced everywhere it is used." };
}

/** Deletes a library file and its stored object, only when nothing uses it. */
export async function deleteLibraryFile(id: string): Promise<DetailsResult> {
  const { permissions } = await requireMediaEditor();
  // Page usage is only visible to page editors, so only they can be sure a
  // file is unused.
  if (!permissions.has("pages.edit")) {
    return {
      ok: false,
      message: "Only page editors can delete library files.",
    };
  }
  if (!UUID.safeParse(id).success)
    return { ok: false, message: "Unknown file." };
  const supabase = await createClient();
  const { data: asset } = await supabase
    .from("media_assets")
    .select("id, storage_bucket, storage_path, library")
    .eq("id", id)
    .maybeSingle();
  if (!asset || !asset.library) {
    return {
      ok: false,
      message:
        "Only library files are deleted here. Remove other photos on their own page.",
    };
  }
  const usage = (await getLibraryUsage()).get(id) ?? [];
  if (usage.length) {
    return {
      ok: false,
      message: `Still used by ${usage.map((u) => u.label).join(", ")}. Remove it there first.`,
    };
  }
  const { error } = await supabase.from("media_assets").delete().eq("id", id);
  if (error) {
    // 23503: a record still points at it (e.g. a video or press kit).
    return {
      ok: false,
      message:
        error.code === "23503"
          ? "Something still uses this file. Remove it there first."
          : "Could not delete the file.",
    };
  }
  await supabase.storage
    .from(asset.storage_bucket)
    .remove([asset.storage_path]);
  refreshPublicMedia();
  return { ok: true, message: "Deleted.", at: new Date().toISOString() };
}
