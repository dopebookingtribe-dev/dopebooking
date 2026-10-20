import type { MetadataRoute } from "next";
import { getPublishedArtists } from "@/modules/artists/queries";
import { getPublishedEvents } from "@/modules/events/queries";
import { getPublishedGalleries } from "@/modules/galleries/queries";
import { getShopProducts } from "@/modules/marketplace/queries";
import { getPublishedVideos } from "@/modules/videos/queries";

const STATIC_PATHS = [
  "/",
  "/artists",
  "/events",
  "/gallery",
  "/videos",
  "/services",
  "/shop",
  "/sell",
  "/legal/imprint",
  "/legal/privacy",
  "/legal/terms",
  "/legal/shop-terms",
  "/legal/seller-terms",
  "/legal/cookies",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [artists, events, galleries, videos, products] = await Promise.all([
    getPublishedArtists(),
    getPublishedEvents(),
    getPublishedGalleries(),
    getPublishedVideos(),
    getShopProducts(),
  ]);
  const url = (path: string) => new URL(path, base).toString();

  return [
    ...STATIC_PATHS.map((path) => ({ url: new URL(path, base).toString() })),
    ...artists.map((artist) => ({
      url: new URL(`/artists/${artist.slug}`, base).toString(),
      lastModified: artist.updatedAt,
    })),
    ...[...events.upcoming, ...events.past].map((event) => ({
      url: url(`/events/${event.slug}`),
      lastModified: event.updatedAt,
    })),
    ...galleries.map((gallery) => ({ url: url(`/gallery/${gallery.slug}`) })),
    ...videos.map((video) => ({ url: url(`/videos/${video.slug}`) })),
    ...products.map((product) => ({ url: url(`/shop/${product.slug}`) })),
  ];
}
