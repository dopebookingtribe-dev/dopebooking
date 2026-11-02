"use server";

import { getPublishedReleases, releaseHref } from "./queries";
import { musicCartSchema, RELEASE_TYPES } from "./schemas";

export type MusicCartLine = {
  releaseId: string;
  title: string;
  artistName: string;
  typeLabel: string;
  href: string;
  coverUrl: string | null;
  price: number;
  currency: string;
};

/** Live prices for the music in a browser cart; unknown or hidden ones drop out. */
export async function priceMusicCart(ids: unknown): Promise<MusicCartLine[]> {
  const parsed = musicCartSchema.safeParse(ids);
  if (!parsed.success || !parsed.data.length) return [];
  const { releases } = await getPublishedReleases();
  const byId = new Map(releases.map((release) => [release.id, release]));
  return parsed.data.flatMap((id) => {
    const release = byId.get(id);
    if (!release || !release.onSale || release.price === null) return [];
    return [
      {
        releaseId: release.id,
        title: release.title,
        artistName: release.artist.name,
        typeLabel: RELEASE_TYPES[release.type],
        href: releaseHref(release),
        coverUrl: release.cover?.url ?? null,
        price: release.price,
        currency: release.currency,
      },
    ];
  });
}
