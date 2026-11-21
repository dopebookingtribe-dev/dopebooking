"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";
import type { ArtCollection } from "@/lib/supabase/database.types";
import { COLLECTIONS, PHOTO_COLLECTIONS } from "../schemas";
import { ArtViewer, type ViewerItem } from "./art-viewer";

type Photo = {
  id: string;
  url: string;
  alt: string;
  width: number;
  height: number;
  credit: string | null;
  collection: ArtCollection | null;
  exhibition?: { slug: string; title: string };
};

/**
 * Exhibition photography as curated sets rather than one long grid: tabs
 * for installations, close-ups, atmosphere and behind the scenes (only the
 * sets that have photos), each in columns at the photos' own shape.
 */
export function PhotoCollections({
  photos,
  showSource = false,
}: {
  photos: Photo[];
  /** Under each photo, link to the exhibition it comes from. */
  showSource?: boolean;
}) {
  const tabsId = useId();
  const sets = PHOTO_COLLECTIONS.filter((key) =>
    photos.some((p) => p.collection === key),
  );
  const options: ("all" | ArtCollection)[] =
    sets.length > 1 || photos.some((p) => !p.collection)
      ? ["all", ...sets]
      : [...sets];
  const [active, setActive] = useState<"all" | ArtCollection>(
    options[0] ?? "all",
  );
  const [index, setIndex] = useState<number | null>(null);

  const shown =
    active === "all" ? photos : photos.filter((p) => p.collection === active);
  const items: ViewerItem[] = shown.map((photo) => ({
    id: photo.id,
    url: photo.url,
    alt: photo.alt,
    width: photo.width,
    height: photo.height,
    credit: photo.credit,
    title: photo.exhibition?.title ?? null,
    lines: photo.collection ? [COLLECTIONS[photo.collection]] : [],
    href: null,
  }));

  return (
    <>
      {options.length > 1 ? (
        <div
          role="tablist"
          aria-label="Photo sets"
          className="-mx-(--gutter) mb-10 flex [scrollbar-width:none] gap-2 overflow-x-auto px-(--gutter) sm:flex-wrap"
        >
          {options.map((key) => {
            const count =
              key === "all"
                ? photos.length
                : photos.filter((p) => p.collection === key).length;
            const selected = key === active;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                id={`${tabsId}-${key}`}
                aria-selected={selected}
                aria-controls={`${tabsId}-panel`}
                onClick={() => setActive(key)}
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-5 text-sm transition-colors ${
                  selected
                    ? "border-accent bg-accent text-accent-ink"
                    : "border-line-strong text-text hover:border-uv hover:text-uv"
                }`}
              >
                {key === "all" ? "All" : COLLECTIONS[key]}
                <span
                  className={`font-label text-xs ${selected ? "text-accent-ink/70" : "text-muted"}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
      <ul
        id={`${tabsId}-panel`}
        role={options.length > 1 ? "tabpanel" : undefined}
        aria-labelledby={options.length > 1 ? `${tabsId}-${active}` : undefined}
        className="columns-2 gap-3 sm:gap-4 lg:columns-3"
      >
        {shown.map((photo, i) => (
          <li key={photo.id} className="mb-3 break-inside-avoid sm:mb-4">
            <button
              type="button"
              onClick={() => setIndex(i)}
              className="group relative block w-full overflow-hidden rounded-lg bg-surface-2"
              style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
            >
              <Image
                src={photo.url}
                alt={photo.alt}
                fill
                sizes="(min-width: 1024px) 24rem, 46vw"
                style={{ objectPosition: "50% 50%" }}
                className="object-cover transition-transform duration-700 ease-(--ease-out) group-hover:scale-[1.03]"
              />
              <span className="sr-only">
                Open photo {i + 1} of {shown.length}
              </span>
            </button>
            {showSource && photo.exhibition ? (
              <Link
                href={`/art-gallery/exhibitions/${photo.exhibition.slug}`}
                className="mt-2 inline-block font-label text-xs text-muted hover:text-accent"
              >
                {photo.exhibition.title}
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
      <ArtViewer
        items={items}
        index={index}
        onIndex={setIndex}
        label="Photo viewer"
      />
    </>
  );
}
