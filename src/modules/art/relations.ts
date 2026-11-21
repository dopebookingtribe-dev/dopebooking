import type { ArtCatalog, ArtExhibitionCard } from "./queries";
import type { Timing } from "./schemas";

/*
 * Relationships derived from the catalogue rather than stored, so they can
 * never disagree with the line-ups and credits they come from.
 */

const timingOrder: Record<Timing, number> = {
  current: 0,
  upcoming: 1,
  past: 2,
};

/** Current first, then upcoming (soonest first), then the archive (newest first). */
export function sortExhibitions<
  T extends Pick<ArtExhibitionCard, "timing" | "startsOn">,
>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    if (a.timing !== b.timing)
      return timingOrder[a.timing] - timingOrder[b.timing];
    const aStart = a.startsOn ?? "9999";
    const bStart = b.startsOn ?? "9999";
    return a.timing === "past"
      ? bStart.localeCompare(aStart)
      : aStart.localeCompare(bStart);
  });
}

export type Collaboration = {
  a: string;
  b: string;
  /** Shared exhibitions and co-credited works. */
  exhibitions: string[];
  works: string[];
};

/**
 * Who worked with whom: artists who share an exhibition or a co-credited
 * work. Co-credits weigh more than sharing a show (collaborationWeight).
 */
export function collaborations(
  catalog: Pick<ArtCatalog, "exhibitions" | "works">,
): Collaboration[] {
  const pairs = new Map<string, Collaboration>();
  const link = (
    x: string,
    y: string,
    kind: "exhibitions" | "works",
    via: string,
  ) => {
    if (x === y) return;
    const [a, b] = x < y ? [x, y] : [y, x];
    const key = `${a}|${b}`;
    const entry = pairs.get(key) ?? { a, b, exhibitions: [], works: [] };
    if (!entry[kind].includes(via)) entry[kind].push(via);
    pairs.set(key, entry);
  };
  for (const exhibition of catalog.exhibitions) {
    const ids = exhibition.artistIds;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        link(ids[i], ids[j], "exhibitions", exhibition.id);
      }
    }
  }
  for (const work of catalog.works) {
    const ids = work.credits.map((credit) => credit.artist.id);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        link(ids[i], ids[j], "works", work.id);
      }
    }
  }
  return [...pairs.values()];
}

export const collaborationWeight = (c: Collaboration) =>
  c.works.length * 2 + c.exhibitions.length;
