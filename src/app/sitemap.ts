import type { MetadataRoute } from "next";
import { getPublishedArtists } from "@/modules/artists/queries";

const STATIC_PATHS = [
  "/",
  "/artists",
  "/events",
  "/gallery",
  "/services",
  "/shop",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const artists = await getPublishedArtists();

  return [
    ...STATIC_PATHS.map((path) => ({ url: new URL(path, base).toString() })),
    ...artists.map((artist) => ({
      url: new URL(`/artists/${artist.slug}`, base).toString(),
      lastModified: artist.updatedAt,
    })),
  ];
}
