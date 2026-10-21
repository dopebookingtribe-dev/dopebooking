"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { ARTISTS_TAG } from "@/modules/artists/queries";
import { EVENTS_TAG } from "@/modules/events/queries";
import { GALLERIES_TAG } from "@/modules/galleries/queries";
import { IMAGE_TYPES } from "@/modules/media/constants";
import { BUCKET } from "@/modules/media/server";
import { SHOP_TAG } from "@/modules/marketplace/queries";
import { VIDEOS_TAG } from "@/modules/videos/queries";
import { DEFAULT_PAGES, isPageKey, PAGE_KEYS, PAGES } from "./pages";
import { MEDIA_TAG, pageTag, SETTINGS_TAG } from "./queries";
import { parsePageContent, parseSettings, type PageContent } from "./schema";

export type SaveResult =
  | { ok: true; message: string; at: string }
  | { ok: false; message: string; issues: { path: string; message: string }[] };

const issuesOf = (error: z.ZodError) =>
  error.issues.slice(0, 20).map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

const failed = (message: string): SaveResult => ({
  ok: false,
  message,
  issues: [],
});

function readJson(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return undefined;
  }
}

/** Pages must keep their built-in blocks (forms, directories) exactly once. */
function checkBuiltins(key: keyof typeof PAGES, content: PageContent) {
  const expected: readonly string[] = PAGES[key].builtins;
  const found: string[] = content.sections.flatMap((section) =>
    section.type === "builtin" ? [section.content.block] : [],
  );
  const missing = expected.filter((block) => !found.includes(block));
  const extra = found.filter(
    (block, index) =>
      !expected.includes(block) || found.indexOf(block) !== index,
  );
  if (missing.length)
    return "This page needs its built-in block. Undo the removal.";
  if (extra.length) return "Built-in blocks can't be added or duplicated.";
  return null;
}

async function writeDraft(key: string, json: string): Promise<SaveResult> {
  if (!isPageKey(key)) return failed("Unknown page.");
  await requirePermission("pages.edit", `/admin/pages/${key}`);
  const parsed = parsePageContent(readJson(json));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Some fields need attention.",
      issues: issuesOf(parsed.error),
    };
  }
  const builtinError = checkBuiltins(key, parsed.data);
  if (builtinError) return failed(builtinError);

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("site_pages")
    .select("key")
    .eq("key", key)
    .maybeSingle();
  const { error } = existing
    ? await supabase
        .from("site_pages")
        .update({ draft: parsed.data })
        .eq("key", key)
    : await supabase
        .from("site_pages")
        .insert({ key, title: PAGES[key].title, draft: parsed.data });
  if (error) return failed("Saving failed. Please try again.");
  return { ok: true, message: "Draft saved.", at: new Date().toISOString() };
}

export async function savePageDraft(key: string, json: string) {
  return writeDraft(key, json);
}

export async function publishPage(
  key: string,
  json: string,
): Promise<SaveResult> {
  const saved = await writeDraft(key, json);
  if (!saved.ok) return saved;
  await requirePermission("pages.publish", `/admin/pages/${key}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_site_page", { p_key: key });
  if (error) return failed("Publishing failed. Your draft is saved.");
  updateTag(pageTag(key));
  updateTag(MEDIA_TAG);
  return {
    ok: true,
    message: "Published. Visitors now see this version.",
    at: new Date().toISOString(),
  };
}

/** Throws the draft away: back to the live version (or defaults). */
export async function discardPageDraft(key: string): Promise<SaveResult> {
  if (!isPageKey(key)) return failed("Unknown page.");
  await requirePermission("pages.edit", `/admin/pages/${key}`);
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_pages")
    .select("published")
    .eq("key", key)
    .maybeSingle();
  if (!data)
    return {
      ok: true,
      message: "Nothing to discard.",
      at: new Date().toISOString(),
    };
  const { error } = data.published
    ? await supabase
        .from("site_pages")
        .update({ draft: data.published })
        .eq("key", key)
    : await supabase.from("site_pages").delete().eq("key", key);
  if (error) return failed("Could not discard the draft.");
  return {
    ok: true,
    message: "Draft discarded.",
    at: new Date().toISOString(),
  };
}

/** Loads the built-in starting content into the draft (not published). */
export async function resetPageDraft(key: string): Promise<SaveResult> {
  if (!isPageKey(key)) return failed("Unknown page.");
  return writeDraft(key, JSON.stringify(DEFAULT_PAGES[key]));
}

// ---------------------------------------------------------------------------
// Site settings
// ---------------------------------------------------------------------------

async function writeSettings(json: string): Promise<SaveResult> {
  await requirePermission("settings.manage", "/admin/settings");
  const parsed = parseSettings(readJson(json));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Some fields need attention.",
      issues: issuesOf(parsed.error),
    };
  }
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("site_settings")
    .select("id")
    .eq("id", 1)
    .maybeSingle();
  const { error } = existing
    ? await supabase
        .from("site_settings")
        .update({ draft: parsed.data })
        .eq("id", 1)
    : await supabase
        .from("site_settings")
        .insert({ id: 1, draft: parsed.data });
  if (error) return failed("Saving failed. Please try again.");
  return { ok: true, message: "Draft saved.", at: new Date().toISOString() };
}

export async function saveSettingsDraft(json: string) {
  return writeSettings(json);
}

export async function publishSettings(json: string): Promise<SaveResult> {
  const saved = await writeSettings(json);
  if (!saved.ok) return saved;
  await requirePermission("pages.publish", "/admin/settings");
  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_site_settings");
  if (error) return failed("Publishing failed. Your draft is saved.");
  updateTag(SETTINGS_TAG);
  updateTag(MEDIA_TAG);
  // Every page shows the header and footer.
  for (const key of PAGE_KEYS) updateTag(pageTag(key));
  return { ok: true, message: "Published.", at: new Date().toISOString() };
}

export async function discardSettingsDraft(): Promise<SaveResult> {
  await requirePermission("settings.manage", "/admin/settings");
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("published")
    .eq("id", 1)
    .maybeSingle();
  if (!data?.published) {
    return {
      ok: true,
      message: "Nothing to discard.",
      at: new Date().toISOString(),
    };
  }
  const { error } = await supabase
    .from("site_settings")
    .update({ draft: data.published })
    .eq("id", 1);
  if (error) return failed("Could not discard the draft.");
  return {
    ok: true,
    message: "Draft discarded.",
    at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Media library
// ---------------------------------------------------------------------------

const LIBRARY_FOLDER = "library/site";

const libraryImageSchema = z.object({
  path: z.string().min(1).max(300),
  alt_text: z
    .string()
    .trim()
    .min(1, "Describe the photo for screen readers.")
    .max(300),
  credit: z.string().trim().max(120),
  width: z.number().int().positive().max(20000),
  height: z.number().int().positive().max(20000),
});

export async function registerLibraryImage(
  input: z.input<typeof libraryImageSchema>,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { user } = await requirePermission("pages.edit", "/admin/media");
  const parsed = libraryImageSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid image.",
    };
  }
  const { path, credit, ...image } = parsed.data;
  if (!path.startsWith(`${LIBRARY_FOLDER}/`) || path.includes("..")) {
    return { ok: false, message: "Invalid upload path." };
  }
  const supabase = await createClient();
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
  const { error } = await supabase.from("media_assets").insert({
    library: "site",
    storage_bucket: BUCKET,
    storage_path: path,
    credit: credit || null,
    created_by: user.id,
    ...image,
  });
  if (error) return { ok: false, message: "Could not save the photo." };
  updateTag(MEDIA_TAG);
  return { ok: true };
}

const imageDetailsSchema = z.object({
  alt_text: z
    .string()
    .trim()
    .min(1, "Describe the photo for screen readers.")
    .max(300),
  credit: z
    .string()
    .trim()
    .max(120)
    .transform((value) => (value === "" ? null : value)),
  focal_x: z.coerce.number().int().min(0).max(100),
  focal_y: z.coerce.number().int().min(0).max(100),
});

export async function updateImageDetails(
  id: string,
  _prev: SaveResult | null,
  formData: FormData,
): Promise<SaveResult> {
  await requirePermission("pages.edit", "/admin/media");
  if (!z.uuid().safeParse(id).success) return failed("Unknown image.");
  const parsed = imageDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the fields.",
      issues: issuesOf(parsed.error),
    };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("media_assets")
    .update(parsed.data)
    .eq("id", id);
  if (error) return failed("Saving failed. Please try again.");
  for (const tag of [
    MEDIA_TAG,
    ARTISTS_TAG,
    EVENTS_TAG,
    GALLERIES_TAG,
    VIDEOS_TAG,
    SHOP_TAG,
  ]) {
    updateTag(tag);
  }
  return { ok: true, message: "Saved.", at: new Date().toISOString() };
}

export async function deleteLibraryImage(id: string): Promise<SaveResult> {
  await requirePermission("pages.edit", "/admin/media");
  if (!z.uuid().safeParse(id).success) return failed("Unknown image.");
  const supabase = await createClient();
  const { data: asset } = await supabase
    .from("media_assets")
    .select("id, storage_bucket, storage_path")
    .eq("id", id)
    .eq("library", "site")
    .maybeSingle();
  if (!asset) return failed("Image not found.");
  const { error } = await supabase.from("media_assets").delete().eq("id", id);
  if (error) return failed("Could not delete the image.");
  await supabase.storage
    .from(asset.storage_bucket)
    .remove([asset.storage_path]);
  updateTag(MEDIA_TAG);
  return { ok: true, message: "Deleted.", at: new Date().toISOString() };
}

// ---------------------------------------------------------------------------
// Demo content
// ---------------------------------------------------------------------------

export async function deleteDemoContent(): Promise<SaveResult> {
  await requirePermission("demo.manage", "/admin/demo");
  const supabase = await createClient();
  const { data: paths, error } = await supabase.rpc("delete_demo_content");
  if (error)
    return failed("Removing demo content failed. Nothing was deleted.");
  const files = (paths ?? []).filter(Boolean);
  for (let i = 0; i < files.length; i += 100) {
    await supabase.storage.from(BUCKET).remove(files.slice(i, i + 100));
  }
  for (const tag of [
    MEDIA_TAG,
    ARTISTS_TAG,
    EVENTS_TAG,
    GALLERIES_TAG,
    VIDEOS_TAG,
    SHOP_TAG,
  ]) {
    updateTag(tag);
  }
  return {
    ok: true,
    message: `Demo content removed (${files.length} files). Pages still point at removed images until you edit them.`,
    at: new Date().toISOString(),
  };
}
