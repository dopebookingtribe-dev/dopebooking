import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Image } from "@/lib/media";
import type { VideoProvider } from "@/lib/supabase/database.types";
import { createPublicClient } from "@/lib/supabase/public";
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
  /** Uploaded poster, else the provider's own thumbnail (if any). */
  poster: Pick<Image, "url" | "width" | "height"> | null;
};

export type VideoDetail = VideoCard & {
  description: string | null;
  event: { slug: string; title: string } | null;
  artist: { slug: string; stageName: string } | null;
};

type VideoFilter = { eventId?: string; artistId?: string };

const CARD_COLUMNS =
  "id, slug, title, provider, provider_ref, featured, is_demo, published_at, poster_asset_id";

function toCard(
  row: {
    id: string;
    slug: string;
    title: string;
    provider: VideoProvider;
    provider_ref: string;
    featured: boolean;
    is_demo: boolean;
    published_at: string | null;
    poster_asset_id: string | null;
  },
  posters: Map<string, Image>,
): VideoCard {
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
  let query = supabase
    .from("videos")
    .select(CARD_COLUMNS)
    .eq("status", "published");
  if (filter.eventId) query = query.eq("event_id", filter.eventId);
  if (filter.artistId) query = query.eq("artist_id", filter.artistId);
  const { data, error } = await query
    .order("featured", { ascending: false })
    .order("published_at", { ascending: false });
  if (error) throw new Error(`Failed to load videos: ${error.message}`);

  const posters = await fetchImagesById(
    supabase,
    data.map((row) => row.poster_asset_id),
  );
  return data.map((row) => toCard(row, posters));
}

export async function getPublishedVideo(
  slug: string,
): Promise<VideoDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(VIDEOS_TAG, "events", "artists");

  const supabase = createPublicClient();
  const { data: video, error } = await supabase
    .from("videos")
    .select(`${CARD_COLUMNS}, description, event_id, artist_id`)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error(`Failed to load video: ${error.message}`);
  if (!video) return null;

  const [posters, event, artist] = await Promise.all([
    fetchImagesById(supabase, [video.poster_asset_id]),
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
    ...toCard(video, posters),
    description: video.description,
    // RLS returns nothing for unpublished events/artists.
    event: event?.data ?? null,
    artist: artist?.data
      ? { slug: artist.data.slug, stageName: artist.data.stage_name }
      : null,
  };
}
