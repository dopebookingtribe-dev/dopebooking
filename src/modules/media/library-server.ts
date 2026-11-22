import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getPermissions } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/dal";
import { publicObjectUrl } from "@/lib/media";
import type { MediaType } from "@/lib/supabase/database.types";
import { isMissingSchema } from "@/lib/supabase/schema-errors";
import { createClient } from "@/lib/supabase/server";
import { isPageKey, PAGES } from "@/modules/cms/pages";
import { isMediaKind, type MediaKind } from "./constants";

/** Whether migration 20261122000100 (files, news, availability) is applied. */
export const cmsUpgradeApplied = cache(async () => {
  const supabase = await createClient();
  const { error } = await supabase
    .from("posts")
    .select("id", { head: true, count: "exact" })
    .limit(1);
  return !isMissingSchema(error);
});

/** Media library access: page editors and catalogue editors. */
export async function requireMediaEditor(nextPath = "/admin/media") {
  const user = await requireUser(nextPath);
  const permissions = await getPermissions(user);
  if (!permissions.has("pages.edit") && !permissions.has("content.manage")) {
    notFound();
  }
  return { user, permissions };
}

export type UsageRef = { label: string; href: string };

const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

function idsIn(value: unknown): Set<string> {
  if (value === null || value === undefined) return new Set();
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return new Set((text.match(UUID_RE) ?? []).map((id) => id.toLowerCase()));
}

/**
 * Where each library file is used: page drafts and live pages, site
 * settings, legal pages, news posts, videos and artist press kits. Deleting
 * is refused while anything uses a file.
 */
export async function getLibraryUsage(): Promise<Map<string, UsageRef[]>> {
  const supabase = await createClient();
  const usage = new Map<string, UsageRef[]>();
  const add = (id: string, ref: UsageRef) => {
    const list = usage.get(id) ?? [];
    if (!list.some((item) => item.label === ref.label)) list.push(ref);
    usage.set(id, list);
  };

  const [pages, settings, posts, videos, artists] = await Promise.all([
    supabase.from("site_pages").select("key, title, draft, published"),
    supabase.from("site_settings").select("draft, published").maybeSingle(),
    supabase.from("posts").select("id, title, cover_asset_id, body"),
    supabase
      .from("videos")
      .select("id, title, file_asset_id")
      .not("file_asset_id", "is", null),
    supabase
      .from("artists")
      .select("id, stage_name, press_kit_asset_id")
      .not("press_kit_asset_id", "is", null),
  ]);

  for (const page of pages.data ?? []) {
    const legal = page.key.startsWith("legal-");
    const name = isPageKey(page.key) ? PAGES[page.key].title : page.title;
    const href = legal
      ? `/admin/legal/${page.key.slice("legal-".length)}`
      : `/admin/pages/${page.key}`;
    const live = idsIn(page.published);
    for (const id of live)
      add(id, { label: `${legal ? "Legal" : "Page"}: ${name}`, href });
    for (const id of idsIn(page.draft)) {
      if (!live.has(id)) {
        add(id, {
          label: `${legal ? "Legal" : "Page"}: ${name} (draft)`,
          href,
        });
      }
    }
  }
  if (settings.data) {
    const ids = new Set([
      ...idsIn(settings.data.draft),
      ...idsIn(settings.data.published),
    ]);
    for (const id of ids)
      add(id, { label: "Site settings", href: "/admin/settings" });
  }
  // News, file videos and press kits arrive with migration 20261122000100.
  if (!isMissingSchema(posts.error)) {
    for (const post of posts.data ?? []) {
      const ids = idsIn(post.body);
      if (post.cover_asset_id) ids.add(post.cover_asset_id);
      for (const id of ids) {
        add(id, {
          label: `News: ${post.title}`,
          href: `/admin/posts/${post.id}`,
        });
      }
    }
  }
  if (!isMissingSchema(videos.error)) {
    for (const video of videos.data ?? []) {
      if (video.file_asset_id) {
        add(video.file_asset_id, {
          label: `Video: ${video.title}`,
          href: `/admin/videos/${video.id}`,
        });
      }
    }
  }
  if (!isMissingSchema(artists.error)) {
    for (const artist of artists.data ?? []) {
      if (artist.press_kit_asset_id) {
        add(artist.press_kit_asset_id, {
          label: `Press kit: ${artist.stage_name}`,
          href: `/admin/artists/${artist.id}`,
        });
      }
    }
  }
  return usage;
}

// ---------------------------------------------------------------------------
// Browsing
// ---------------------------------------------------------------------------

/** Where a file lives: the shared library, or one record's own photos. */
export const MEDIA_SOURCES = {
  library: { label: "Library", column: "library", href: null },
  artists: { label: "Artists", column: "artist_id", href: "/admin/artists/" },
  events: { label: "Events", column: "event_id", href: "/admin/events/" },
  galleries: {
    label: "Galleries",
    column: "gallery_id",
    href: "/admin/galleries/",
  },
  videos: {
    label: "Video posters",
    column: "video_id",
    href: "/admin/videos/",
  },
  products: {
    label: "Products",
    column: "product_id",
    href: "/admin/products/",
  },
  music: {
    label: "Music artwork",
    column: "music_release_id",
    href: "/admin/music/",
  },
  "art-artists": {
    label: "Art: artists",
    column: "art_artist_id",
    href: "/admin/art/artists/",
  },
  "art-exhibitions": {
    label: "Art: exhibitions",
    column: "art_exhibition_id",
    href: "/admin/art/exhibitions/",
  },
  "art-artworks": {
    label: "Art: artworks",
    column: "art_artwork_id",
    href: "/admin/art/artworks/",
  },
} as const;

export type MediaSource = keyof typeof MEDIA_SOURCES | "all";

export function isMediaSource(value: unknown): value is MediaSource {
  return (
    value === "all" || (typeof value === "string" && value in MEDIA_SOURCES)
  );
}

export const MEDIA_SORTS = {
  newest: "Newest first",
  oldest: "Oldest first",
  largest: "Largest first",
  name: "Name (A–Z)",
} as const;
export type MediaSort = keyof typeof MEDIA_SORTS;

export type MediaFilter = {
  q?: string;
  kind?: MediaKind;
  source?: MediaSource;
  usage?: "used" | "unused";
  sort?: MediaSort;
  page?: number;
};

export type MediaItem = {
  id: string;
  kind: MediaKind;
  url: string;
  bucket: string;
  path: string;
  alt: string;
  credit: string | null;
  width: number | null;
  height: number | null;
  focalX: number;
  focalY: number;
  mimeType: string | null;
  sizeBytes: number | null;
  durationSeconds: number | null;
  originalName: string | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string | null;
  /** Library file, or the record that owns this photo. */
  owner: { source: keyof typeof MEDIA_SOURCES; href: string | null };
  usage: UsageRef[];
};

const BASE_COLUMNS =
  "id, type, storage_bucket, storage_path, alt_text, credit, width, height, focal_x, focal_y, is_demo, created_at, library, artist_id, event_id, gallery_id, video_id, product_id, music_release_id, art_artist_id, art_exhibition_id, art_artwork_id";
const FILE_COLUMNS =
  "mime_type, size_bytes, duration_seconds, original_name, updated_at";

type Row = {
  id: string;
  type: MediaType;
  storage_bucket: string;
  storage_path: string;
  alt_text: string;
  credit: string | null;
  width: number | null;
  height: number | null;
  focal_x: number;
  focal_y: number;
  is_demo: boolean;
  created_at: string;
  library: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  duration_seconds?: number | null;
  original_name?: string | null;
  updated_at?: string | null;
} & Record<string, unknown>;

function toItem(row: Row, usage: Map<string, UsageRef[]>): MediaItem {
  let owner: MediaItem["owner"] = { source: "library", href: null };
  for (const [source, rule] of Object.entries(MEDIA_SOURCES)) {
    const ownerId = row[rule.column];
    if (source !== "library" && typeof ownerId === "string" && ownerId) {
      owner = {
        source: source as keyof typeof MEDIA_SOURCES,
        href: rule.href ? `${rule.href}${ownerId}` : null,
      };
      break;
    }
  }
  return {
    id: row.id,
    kind: isMediaKind(row.type) ? row.type : "image",
    url: publicObjectUrl(row.storage_bucket, row.storage_path),
    bucket: row.storage_bucket,
    path: row.storage_path,
    alt: row.alt_text,
    credit: row.credit,
    width: row.width,
    height: row.height,
    focalX: row.focal_x,
    focalY: row.focal_y,
    mimeType: row.mime_type ?? null,
    sizeBytes: row.size_bytes ?? null,
    durationSeconds: row.duration_seconds ?? null,
    originalName: row.original_name ?? null,
    isDemo: row.is_demo,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? null,
    owner,
    usage:
      owner.source === "library"
        ? (usage.get(row.id) ?? [])
        : owner.href
          ? [{ label: MEDIA_SOURCES[owner.source].label, href: owner.href }]
          : [],
  };
}

/** Escapes a search term for a PostgREST `or` filter. */
function searchTerm(q: string) {
  return q
    .replace(/[%_,().*\\"]/g, " ")
    .trim()
    .slice(0, 80);
}

export const PAGE_SIZE = 24;

export async function listMedia(filter: MediaFilter) {
  const supabase = await createClient();
  const source = filter.source ?? "library";
  const sort = filter.sort ?? "newest";
  const page = Math.max(1, filter.page ?? 1);
  const usage = await getLibraryUsage();
  const term = filter.q ? searchTerm(filter.q) : "";
  // Usage is worked out in the app, so that filter pages in memory.
  const inMemory = Boolean(filter.usage);

  const run = (withFileColumns: boolean) => {
    let query = supabase
      .from("media_assets")
      .select(
        withFileColumns ? `${BASE_COLUMNS}, ${FILE_COLUMNS}` : BASE_COLUMNS,
        {
          count: "exact",
        },
      );
    if (source !== "all") {
      query = query.not(MEDIA_SOURCES[source].column, "is", null);
    }
    if (filter.kind) query = query.eq("type", filter.kind);
    if (term) {
      const fields = ["alt_text", "credit", "storage_path"];
      if (withFileColumns) fields.push("original_name");
      query = query.or(fields.map((f) => `${f}.ilike.%${term}%`).join(","));
    }
    if (sort === "oldest")
      query = query.order("created_at", { ascending: true });
    else if (sort === "name")
      query = query.order("alt_text", { ascending: true });
    else if (sort === "largest" && withFileColumns) {
      query = query.order("size_bytes", {
        ascending: false,
        nullsFirst: false,
      });
    }
    query = query.order("created_at", { ascending: false });
    return inMemory
      ? query.limit(2000)
      : query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  };

  let result = await run(true);
  let migrated = true;
  if (isMissingSchema(result.error)) {
    migrated = false;
    result = await run(false);
  }
  const rows = ((result.data ?? []) as unknown as Row[]).map((row) =>
    toItem(row, usage),
  );

  if (!inMemory) {
    return { items: rows, total: result.count ?? rows.length, page, migrated };
  }
  const filtered = rows.filter((item) =>
    filter.usage === "used" ? item.usage.length > 0 : item.usage.length === 0,
  );
  return {
    items: filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: filtered.length,
    page,
    migrated,
  };
}

export async function getMediaItem(id: string): Promise<MediaItem | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  let result = await supabase
    .from("media_assets")
    .select(`${BASE_COLUMNS}, ${FILE_COLUMNS}`)
    .eq("id", id)
    .maybeSingle();
  if (isMissingSchema(result.error)) {
    result = await supabase
      .from("media_assets")
      .select(BASE_COLUMNS)
      .eq("id", id)
      .maybeSingle();
  }
  if (!result.data) return null;
  const usage = await getLibraryUsage();
  return toItem(result.data as unknown as Row, usage);
}

export type LibraryFile = {
  id: string;
  kind: MediaKind;
  url: string;
  title: string;
  mimeType: string | null;
  sizeBytes: number | null;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  createdAt: string;
};

/** Library files for pickers (videos, press kits, news embeds). */
export async function listLibraryFiles(
  kinds: MediaKind[],
): Promise<LibraryFile[]> {
  const supabase = await createClient();
  let result = await supabase
    .from("media_assets")
    .select(
      "id, type, storage_bucket, storage_path, alt_text, width, height, created_at, mime_type, size_bytes, duration_seconds",
    )
    .eq("library", "site")
    .in("type", kinds)
    .order("created_at", { ascending: false })
    .limit(500);
  if (isMissingSchema(result.error)) {
    // Before the migration the library holds images only.
    if (!kinds.includes("image")) return [];
    result = (await supabase
      .from("media_assets")
      .select(
        "id, type, storage_bucket, storage_path, alt_text, width, height, created_at",
      )
      .eq("library", "site")
      .eq("type", "image")
      .order("created_at", { ascending: false })
      .limit(500)) as typeof result;
  }
  return (result.data ?? []).map((row) => ({
    id: row.id,
    kind: isMediaKind(row.type) ? row.type : "image",
    url: publicObjectUrl(row.storage_bucket, row.storage_path),
    title: row.alt_text,
    mimeType: row.mime_type ?? null,
    sizeBytes: row.size_bytes ?? null,
    durationSeconds: row.duration_seconds ?? null,
    width: row.width,
    height: row.height,
    createdAt: row.created_at,
  }));
}
