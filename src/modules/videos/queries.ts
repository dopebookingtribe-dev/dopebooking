import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import type { Image } from "@/lib/media";
import { publicObjectUrl } from "@/lib/media";
import type { Database, VideoProvider } from "@/lib/supabase/database.types";
import { createPublicClient } from "@/lib/supabase/public";
import { isMissingSchema } from "@/lib/supabase/schema-errors";
import { providerThumbnail } from "@/lib/video";
import { fetchImagesById } from "@/modules/media/queries";

export const VIDEOS_TAG = "videos";

export type VideoCard = {
  id: string;
  slug: string;
  title: string;
  provider: VideoProvider;
  ref: string;
  featured: boolean;
  isDemo: boolean;
  publishedAt: string | null;
  /** Public URL of the uploaded file when provider = "file". */
  fileUrl: string | null;
  mimeType: string | null;
  /** Uploaded poster, else the provider's own thumbnail (if any). */
  poster: Pick<Image, "url" | "width" | "height"> | null;
};

export type VideoDetail = VideoCard & {
  description: string | null;
  event: { slug: string; title: string } | null;
  artist: { slug: string; stageName: string } | null;
};

type VideoFilter = {
  eventId?: string;
  artistId?: string;
  artArtistId?: string;
  artExhibitionId?: string;
};

const LEGACY_COLUMNS =
  "id, slug, title, provider, provider_ref, featured, is_demo, published_at, poster_asset_id";
// file_asset_id and sort_order arrive with migration 20261122000100.
const CARD_COLUMNS = `${LEGACY_COLUMNS}, file_asset_id, sort_order`;

type CardRow = {
  id: string;
  slug: string;
  title: string;
  provider: VideoProvider;
  provider_ref: string;
  featured: boolean;
  is_demo: boolean;
  published_at: string | null;
  poster_asset_id: string | null;
  file_asset_id?: string | null;
};

type FileInfo = { url: string; mimeType: string | null };

/** Public URLs of uploaded video files (library assets), by asset id. */
async function fetchVideoFiles(
  supabase: SupabaseClient<Database>,
  rows: CardRow[],
): Promise<Map<string, FileInfo>> {
  const ids = [
    ...new Set(
      rows.map((row) => row.file_asset_id).filter((id): id is string => !!id),
    ),
  ];
  const files = new Map<string, FileInfo>();
  if (!ids.length) return files;
  const { data } = await supabase
    .from("media_assets")
    .select("id, storage_bucket, storage_path, mime_type")
    .in("id", ids);
  for (const row of data ?? []) {
    files.set(row.id, {
      url: publicObjectUrl(row.storage_bucket, row.storage_path),
      mimeType: row.mime_type,
    });
  }
  return files;
}

function toCard(
  row: CardRow,
  posters: Map<string, Image>,
  files: Map<string, FileInfo> = new Map(),
): VideoCard {
  const file = row.file_asset_id ? files.get(row.file_asset_id) : undefined;
  const uploaded = row.poster_asset_id
    ? posters.get(row.poster_asset_id)
    : undefined;
  const fallback = providerThumbnail({
    provider: row.provider,
    ref: row.provider_ref,
  });
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    provider: row.provider,
    ref: row.provider_ref,
    featured: row.featured,
    isDemo: row.is_demo,
    publishedAt: row.published_at,
    fileUrl: file?.url ?? null,
    mimeType: file?.mimeType ?? null,
    poster: uploaded
      ? { url: uploaded.url, width: uploaded.width, height: uploaded.height }
      : fallback
        ? { url: fallback, width: 1280, height: 720 }
        : null,
  };
}

/** Published videos, newest first; optionally only one event's or artist's. */
export async function getPublishedVideos(
  filter: VideoFilter = {},
): Promise<VideoCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(VIDEOS_TAG);

  const supabase = createPublicClient();
  const run = (columns: string, ordered: boolean) => {
    let query = supabase
      .from("videos")
      .select(columns)
      .eq("status", "published");
    if (filter.eventId) query = query.eq("event_id", filter.eventId);
    if (filter.artistId) query = query.eq("artist_id", filter.artistId);
    if (filter.artArtistId) {
      query = query.eq("art_artist_id", filter.artArtistId);
    }
    if (filter.artExhibitionId) {
      query = query.eq("art_exhibition_id", filter.artExhibitionId);
    }
    query = query.order("featured", { ascending: false });
    if (ordered) query = query.order("sort_order");
    return query
      .order("published_at", { ascending: false })
      .overrideTypes<CardRow[], { merge: false }>();
  };
  let { data, error } = await run(CARD_COLUMNS, true);
  if (isMissingSchema(error))
    ({ data, error } = await run(LEGACY_COLUMNS, false));
  // Art Gallery columns arrive with migration 20261121000100; until then
  // art pages simply have no videos.
  const artFilter = filter.artArtistId || filter.artExhibitionId;
  if (error && artFilter) return [];
  if (error || !data)
    throw new Error(`Failed to load videos: ${error?.message}`);
  const rows = data;

  const [posters, files] = await Promise.all([
    fetchImagesById(
      supabase,
      rows.map((row) => row.poster_asset_id),
    ),
    fetchVideoFiles(supabase, rows),
  ]);
  return rows.map((row) => toCard(row, posters, files));
}

export async function getPublishedVideo(
  slug: string,
): Promise<VideoDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(VIDEOS_TAG, "events", "artists");

  const supabase = createPublicClient();
  type DetailRow = CardRow & {
    description: string | null;
    event_id: string | null;
    artist_id: string | null;
  };
  const run = (columns: string) =>
    supabase
      .from("videos")
      .select(`${columns}, description, event_id, artist_id`)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle()
      .overrideTypes<DetailRow | null, { merge: false }>();
  let { data: video, error } = await run(CARD_COLUMNS);
  if (isMissingSchema(error))
    ({ data: video, error } = await run(LEGACY_COLUMNS));
  if (error) throw new Error(`Failed to load video: ${error.message}`);
  if (!video) return null;

  const [posters, files, event, artist] = await Promise.all([
    fetchImagesById(supabase, [video.poster_asset_id]),
    fetchVideoFiles(supabase, [video]),
    video.event_id
      ? supabase
          .from("events")
          .select("slug, title")
          .eq("id", video.event_id)
          .maybeSingle()
      : null,
    video.artist_id
      ? supabase
          .from("artists")
          .select("slug, stage_name")
          .eq("id", video.artist_id)
          .maybeSingle()
      : null,
  ]);

  return {
    ...toCard(video, posters, files),
    description: video.description,
    // RLS returns nothing for unpublished events/artists.
    event: event?.data ?? null,
    artist: artist?.data
      ? { slug: artist.data.slug, stageName: artist.data.stage_name }
      : null,
  };
}
