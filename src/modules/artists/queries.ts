import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { toImage, type Image } from "@/lib/media";
import type { LinkPlatform } from "@/lib/supabase/database.types";
import { createPublicClient } from "@/lib/supabase/public";

export const ARTISTS_TAG = "artists";

export type ArtistCard = {
  id: string;
  slug: string;
  stageName: string;
  tagline: string | null;
  country: string | null;
  genres: string[];
  featured: boolean;
  portrait: Image | null;
  updatedAt: string;
};

export type ArtistProfile = ArtistCard & {
  bio: string | null;
  basedIn: string | null;
  links: { platform: LinkPlatform; url: string }[];
  images: Image[];
};

const MEDIA_COLUMNS =
  "id, artist_id, storage_bucket, storage_path, alt_text, credit, width, height, sort_order";

/** Published roster, ordered for display. Cached until an admin edit. */
export async function getPublishedArtists(): Promise<ArtistCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(ARTISTS_TAG);

  const supabase = createPublicClient();
  const { data: artists, error } = await supabase
    .from("artists")
    .select(
      "id, slug, stage_name, tagline, country, genres, featured, portrait_asset_id, updated_at",
    )
    .eq("status", "published")
    .order("featured", { ascending: false })
    .order("sort_order")
    .order("stage_name");
  if (error) throw new Error(`Failed to load artists: ${error.message}`);

  const portraitIds = artists
    .map((artist) => artist.portrait_asset_id)
    .filter((id): id is string => id !== null);
  const portraits = new Map<string, Image>();
  if (portraitIds.length) {
    const { data: media, error: mediaError } = await supabase
      .from("media_assets")
      .select(MEDIA_COLUMNS)
      .in("id", portraitIds);
    if (mediaError) {
      throw new Error(`Failed to load portraits: ${mediaError.message}`);
    }
    for (const row of media) portraits.set(row.id, toImage(row));
  }

  return artists.map((artist) => ({
    id: artist.id,
    slug: artist.slug,
    stageName: artist.stage_name,
    tagline: artist.tagline,
    country: artist.country,
    genres: artist.genres,
    featured: artist.featured,
    portrait: artist.portrait_asset_id
      ? (portraits.get(artist.portrait_asset_id) ?? null)
      : null,
    updatedAt: artist.updated_at,
  }));
}

export async function getPublishedArtist(
  slug: string,
): Promise<ArtistProfile | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(ARTISTS_TAG);

  const supabase = createPublicClient();
  const { data: artist, error } = await supabase
    .from("artists")
    .select(
      "id, slug, stage_name, tagline, bio, country, based_in, genres, featured, portrait_asset_id, updated_at",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error(`Failed to load artist: ${error.message}`);
  if (!artist) return null;

  const [links, media] = await Promise.all([
    supabase
      .from("artist_links")
      .select("platform, url")
      .eq("artist_id", artist.id)
      .order("sort_order"),
    supabase
      .from("media_assets")
      .select(MEDIA_COLUMNS)
      .eq("artist_id", artist.id)
      .order("sort_order")
      .order("created_at"),
  ]);
  if (links.error)
    throw new Error(`Failed to load links: ${links.error.message}`);
  if (media.error)
    throw new Error(`Failed to load media: ${media.error.message}`);

  const images = media.data.map(toImage);
  return {
    id: artist.id,
    slug: artist.slug,
    stageName: artist.stage_name,
    tagline: artist.tagline,
    bio: artist.bio,
    country: artist.country,
    basedIn: artist.based_in,
    genres: artist.genres,
    featured: artist.featured,
    portrait:
      images.find((image) => image.id === artist.portrait_asset_id) ?? null,
    links: links.data,
    images,
    updatedAt: artist.updated_at,
  };
}
