"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { DemoBadge } from "@/components/ui/demo-badge";
import type { ArtworkCard } from "../queries";
import { artworkLines } from "../format";
import { ArtViewer, type ViewerItem } from "./art-viewer";

export function toViewerItem(work: ArtworkCard): ViewerItem | null {
  if (!work.image) return null;
  return {
    id: work.id,
    url: work.image.url,
    alt: work.image.alt,
    width: work.image.width,
    height: work.image.height,
    title: work.title,
    credits: work.credits.map((c) => ({
      name: c.artist.name,
      href: `/art-gallery/artists/${c.artist.slug}`,
    })),
    lines: artworkLines(work),
    description: work.description,
    href: `/art-gallery/works/${work.slug}`,
    credit: work.image.credit,
  };
}

/**
 * Artworks hung in columns at their own shape (never cropped), each with a
 * wall label. Selecting one opens the viewer; the title links to its page.
 */
export function ArtworkGrid({
  works,
  showCredits = true,
  showDemo = true,
  columns = 3,
}: {
  works: ArtworkCard[];
  showCredits?: boolean;
  showDemo?: boolean;
  columns?: 2 | 3 | 4;
}) {
  const [index, setIndex] = useState<number | null>(null);
  const viewable = works.filter((work) => work.image);
  const items = viewable
    .map(toViewerItem)
    .filter((item): item is ViewerItem => !!item);
  const cols = {
    2: "sm:columns-2",
    3: "sm:columns-2 lg:columns-3",
    4: "sm:columns-3 xl:columns-4",
  }[columns];

  return (
    <>
      <ul className={`columns-2 gap-4 sm:gap-8 ${cols}`}>
        {works.map((work) => {
          const at = viewable.indexOf(work);
          const together = work.credits.length > 1;
          return (
            <li
              key={work.id}
              className="art-reveal mb-10 break-inside-avoid sm:mb-14"
            >
              <figure>
                {work.image ? (
                  <button
                    type="button"
                    onClick={() => setIndex(at)}
                    className="group relative block w-full overflow-hidden bg-surface-2 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.9)]"
                    style={{
                      aspectRatio: `${work.image.width} / ${work.image.height}`,
                    }}
                  >
                    <Image
                      src={work.image.url}
                      alt={work.image.alt}
                      fill
                      sizes="(min-width: 1024px) 24rem, (min-width: 640px) 45vw, 46vw"
                      className="object-contain transition-transform duration-700 ease-(--ease-out) group-hover:scale-[1.02]"
                    />
                    <span className="sr-only">
                      View {work.title} full screen
                    </span>
                    {work.isDemo && showDemo ? (
                      <DemoBadge className="absolute top-2 left-2" />
                    ) : null}
                  </button>
                ) : (
                  <div
                    className="flex aspect-square items-center justify-center bg-surface-1 font-serif-art text-6xl text-line-strong italic"
                    aria-hidden
                  >
                    {work.title.slice(0, 1)}
                  </div>
                )}
                <figcaption className="mt-4">
                  {together ? (
                    <p className="mb-1 font-label text-xs text-uv">
                      Made together
                    </p>
                  ) : null}
                  <Link
                    href={`/art-gallery/works/${work.slug}`}
                    className="font-serif-art text-xl leading-snug italic decoration-line-strong underline-offset-4 hover:text-accent hover:underline sm:text-2xl"
                  >
                    {work.title}
                  </Link>
                  {showCredits && work.credits.length ? (
                    <p className="mt-1 text-sm text-text/85">
                      {work.credits.map((c) => c.artist.name).join(" & ")}
                    </p>
                  ) : null}
                  <p className="mt-1 font-label text-xs text-muted">
                    {artworkLines(work).slice(0, 3).join(" · ")}
                  </p>
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ul>
      <ArtViewer items={items} index={index} onIndex={setIndex} />
    </>
  );
}
