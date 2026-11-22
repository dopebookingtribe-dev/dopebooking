import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { publicObjectUrl, type Image } from "@/lib/media";
import type { MediaType } from "@/lib/supabase/database.types";
import { createPublicClient } from "@/lib/supabase/public";
import { isMissingSchema } from "@/lib/supabase/schema-errors";
import { fetchImagesById } from "@/modules/media/queries";
import { embeddedIds, parseBody, readingMinutes, type Block } from "./body";

export const POSTS_TAG = "posts";

export type PostCard = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  tags: string[];
  authorName: string | null;
  featured: boolean;
  isDemo: boolean;
  publishedAt: string;
  cover: Image | null;
  readingMinutes: number;
};

export type EmbedFile = {
  id: string;
  kind: MediaType;
  url: string;
  title: string;
  credit: string | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  position: string;
};

export type PostDetail = PostCard & {
  blocks: Block[];
  embeds: Record<string, EmbedFile>;
  seoTitle: string | null;
  seoDescription: string | null;
  artist: { slug: string; stageName: string } | null;
  event: { slug: string; title: string } | null;
};

const CARD_COLUMNS =
  "id, slug, title, excerpt, body, category, tags, author_name, featured, is_demo, published_at, cover_asset_id";

type CardRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  category: string | null;
  tags: string[];
  author_name: string | null;
  featured: boolean;
  is_demo: boolean;
  published_at: string | null;
  cover_asset_id: string | null;
};

export function toPostCard(row: CardRow, covers: Map<string, Image>): PostCard {
  const blocks = parseBody(row.body);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    category: row.category,
    tags: row.tags,
    authorName: row.author_name,
    featured: row.featured,
    isDemo: row.is_demo,
    publishedAt: row.published_at ?? new Date().toISOString(),
    cover: row.cover_asset_id ? (covers.get(row.cover_asset_id) ?? null) : null,
    readingMinutes: readingMinutes(blocks),
  };
}

export type PostFilter = {
  category?: string;
  tag?: string;
  artistId?: string;
  limit?: number;
};

/**
 * Published posts, newest first (featured ones lead when asked). RLS hides
 * drafts and posts scheduled for later. Before the database update this
 * simply returns no posts.
 */
export async function getPublishedPosts(
  filter: PostFilter = {},
): Promise<PostCard[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(POSTS_TAG);

  const supabase = createPublicClient();
  let query = supabase
    .from("posts")
    .select(CARD_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(Math.min(filter.limit ?? 60, 100));
  if (filter.category) query = query.eq("category", filter.category);
  if (filter.tag) query = query.contains("tags", [filter.tag]);
  if (filter.artistId) query = query.eq("artist_id", filter.artistId);
  const { data, error } = await query;
  if (isMissingSchema(error)) return [];
  if (error) throw new Error(`Failed to load news: ${error.message}`);
  const covers = await fetchImagesById(
    supabase,
    data.map((row) => row.cover_asset_id),
  );
  return data.map((row) => toPostCard(row, covers));
}

/** Library files a post embeds (photos, videos, audio, PDFs), by id. */
export async function fetchEmbeds(
  supabase: ReturnType<typeof createPublicClient>,
  ids: string[],
): Promise<Record<string, EmbedFile>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return {};
  let result = await supabase
    .from("media_assets")
    .select(
      "id, type, storage_bucket, storage_path, alt_text, credit, width, height, focal_x, focal_y, mime_type",
    )
    .in("id", unique);
  if (isMissingSchema(result.error)) {
    result = (await supabase
      .from("media_assets")
      .select(
        "id, type, storage_bucket, storage_path, alt_text, credit, width, height, focal_x, focal_y",
      )
      .in("id", unique)) as typeof result;
  }
  return Object.fromEntries(
    (result.data ?? []).map((row) => [
      row.id,
      {
        id: row.id,
        kind: row.type,
        url: publicObjectUrl(row.storage_bucket, row.storage_path),
        title: row.alt_text,
        credit: row.credit,
        mimeType: row.mime_type ?? null,
        width: row.width,
        height: row.height,
        position: `${row.focal_x ?? 50}% ${row.focal_y ?? 50}%`,
      } satisfies EmbedFile,
    ]),
  );
}

type DetailRow = CardRow & {
  seo_title: string | null;
  seo_description: string | null;
  artist_id: string | null;
  event_id: string | null;
};

/** Builds the full post view from a row (public page and admin preview). */
export async function buildPostDetail(
  supabase: ReturnType<typeof createPublicClient>,
  row: DetailRow,
): Promise<PostDetail> {
  const blocks = parseBody(row.body);
  const [covers, embeds, artist, event] = await Promise.all([
    fetchImagesById(supabase, [row.cover_asset_id]),
    fetchEmbeds(supabase, embeddedIds(blocks)),
    row.artist_id
      ? supabase
          .from("artists")
          .select("slug, stage_name")
          .eq("id", row.artist_id)
          .maybeSingle()
      : null,
    row.event_id
      ? supabase
          .from("events")
          .select("slug, title")
          .eq("id", row.event_id)
          .maybeSingle()
      : null,
  ]);
  return {
    ...toPostCard(row, covers),
    blocks,
    embeds,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    // RLS returns nothing for unpublished artists and events.
    artist: artist?.data
      ? { slug: artist.data.slug, stageName: artist.data.stage_name }
      : null,
    event: event?.data ?? null,
  };
}

export const DETAIL_COLUMNS = `${CARD_COLUMNS}, seo_title, seo_description, artist_id, event_id`;

export async function getPublishedPost(
  slug: string,
): Promise<PostDetail | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(POSTS_TAG, "artists", "events", "media");

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("posts")
    .select(DETAIL_COLUMNS)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (isMissingSchema(error)) return null;
  if (error) throw new Error(`Failed to load the post: ${error.message}`);
  if (!data) return null;
  return buildPostDetail(supabase, data);
}

/** Categories that have at least one published post, for the filter. */
export async function getPostCategories(): Promise<string[]> {
  const posts = await getPublishedPosts({ limit: 100 });
  return [
    ...new Set(
      posts.map((post) => post.category).filter((c): c is string => !!c),
    ),
  ].sort();
}
