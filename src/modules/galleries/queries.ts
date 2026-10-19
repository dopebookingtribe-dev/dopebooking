import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { toImage, type Image } from "@/lib/media";
import { createPublicClient } from "@/lib/supabase/public";
import { fetchImagesById } from "@/modules/media/queries";
import { MEDIA_COLUMNS } from "@/modules/media/server";

export const GALLERIES_TAG = "galleries";

export type GalleryCard = {
  id: string;
  slug: string;
  title: string;
  publishedAt: string | null;
  cover: Image | null;
};

export type GalleryDetail = GalleryCard & {
  description: string | null;
  photographer: string | null;
  event: { slug: string; title: string } | null;
  images: Image[];
};

const CARD_COLUMNS = "id, slug, title, published_at, cover_asset_id";

/** Published galleries, newest first; optionally only one event's. */
export async function getPublishedGalleries(
  filter: { eventId?: string } = {},
): Promise<GalleryCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(GALLERIES_TAG);

  const supabase = createPublicClient();
  let query = supabase
    .from("galleries")
    .select(CARD_COLUMNS)
    .eq("status", "published");
  if (filter.eventId) query = query.eq("event_id", filter.eventId);
  const { data, error } = await query.order("published_at", {
    ascending: false,
  });
  if (error) throw new Error(`Failed to load galleries: ${error.message}`);

  const covers = await fetchImagesById(
    supabase,
    data.map((row) => row.cover_asset_id),
  );
  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    publishedAt: row.published_at,
    cover: row.cover_asset_id ? (covers.get(row.cover_asset_id) ?? null) : null,
  }));
}

export async function getPublishedGallery(
  slug: string,
): Promise<GalleryDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(GALLERIES_TAG, "events");

  const supabase = createPublicClient();
  const { data: gallery, error } = await supabase
    .from("galleries")
    .select(`${CARD_COLUMNS}, description, photographer, event_id`)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error(`Failed to load gallery: ${error.message}`);
  if (!gallery) return null;

  const [media, event] = await Promise.all([
    supabase
      .from("media_assets")
      .select(MEDIA_COLUMNS)
      .eq("gallery_id", gallery.id)
      .order("sort_order")
      .order("created_at"),
    gallery.event_id
      ? supabase
          .from("events")
          .select("slug, title")
          .eq("id", gallery.event_id)
          .maybeSingle()
      : null,
  ]);
  if (media.error) {
    throw new Error(`Failed to load photos: ${media.error.message}`);
  }

  const images = media.data.map(toImage);
  return {
    id: gallery.id,
    slug: gallery.slug,
    title: gallery.title,
    publishedAt: gallery.published_at,
    description: gallery.description,
    photographer: gallery.photographer,
    cover: images.find((image) => image.id === gallery.cover_asset_id) ?? null,
    event: event?.data ?? null,
    images,
  };
}
