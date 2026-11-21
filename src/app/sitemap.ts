import type { MetadataRoute } from "next";
import { getArtCatalog } from "@/modules/art/queries";
import { getPublishedArtists } from "@/modules/artists/queries";
import { getPublishedEvents } from "@/modules/events/queries";
import { getPublishedGalleries } from "@/modules/galleries/queries";
import { getShopProducts } from "@/modules/marketplace/queries";
import { getPublishedReleases, releaseHref } from "@/modules/music/queries";
import { getPublishedVideos } from "@/modules/videos/queries";

const STATIC_PATHS = [
  "/",
  "/artists",
  "/events",
  "/gallery",
  "/videos",
  "/services",
  "/shop",
  "/music",
  "/sell",
  "/art-gallery",
  "/art-gallery/exhibitions",
  "/art-gallery/artists",
  "/art-gallery/collaborate",
  "/legal/imprint",
  "/legal/privacy",
  "/legal/terms",
  "/legal/shop-terms",
  "/legal/seller-terms",
  "/legal/music-license",
  "/legal/music-seller-terms",
  "/legal/cookies",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [artists, events, galleries, videos, products, music, art] =
    await Promise.all([
      getPublishedArtists(),
      getPublishedEvents(),
      getPublishedGalleries(),
      getPublishedVideos(),
      getShopProducts(),
      getPublishedReleases(),
      getArtCatalog(),
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
    ...music.releases.map((release) => ({ url: url(releaseHref(release)) })),
    ...art.exhibitions.map((e) => ({
      url: url(`/art-gallery/exhibitions/${e.slug}`),
      lastModified: e.updatedAt,
    })),
    ...art.artists.map((a) => ({
      url: url(`/art-gallery/artists/${a.slug}`),
      lastModified: a.updatedAt,
    })),
    ...art.works.map((w) => ({
      url: url(`/art-gallery/works/${w.slug}`),
      lastModified: w.updatedAt,
    })),
  ];
}
