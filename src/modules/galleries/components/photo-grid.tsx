"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Image as ImageData } from "@/lib/media";

type Layout = "masonry" | "mosaic" | "filmstrip";

// Mosaic rhythm: every seventh photo takes a 2x2 tile.
const mosaicSpan = (i: number) =>
  i % 7 === 0 ? "col-span-2 row-span-2" : i % 7 === 4 ? "col-span-2" : "";

/** Photos in a masonry, mosaic or filmstrip layout; each opens full screen. */
export function PhotoGrid({
  images,
  layout = "masonry",
}: {
  images: ImageData[];
  layout?: Layout;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState<number | null>(null);
  const current = index === null ? null : images[index];

  const open = (next: number) => {
    setIndex(next);
    dialogRef.current?.showModal();
  };
  const step = useCallback(
    (delta: number) =>
      setIndex((value) =>
        value === null
          ? value
          : (value + delta + images.length) % images.length,
      ),
    [images.length],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    const onClose = () => setIndex(null);
    dialog.addEventListener("keydown", onKey);
    dialog.addEventListener("close", onClose);
    return () => {
      dialog.removeEventListener("keydown", onKey);
      dialog.removeEventListener("close", onClose);
    };
  }, [step]);

  const trigger = (image: ImageData, i: number, className: string) => (
    <button
      type="button"
      onClick={() => open(i)}
      className={`group relative block overflow-hidden rounded-(--radius) bg-surface-2 ${className}`}
    >
      <Image
        src={image.url}
        alt={image.alt}
        fill
        priority={i < 2}
        sizes={
          layout === "filmstrip"
            ? "(min-width: 1024px) 34vw, 80vw"
            : "(min-width: 1024px) 30vw, 50vw"
        }
        style={{ objectPosition: image.position }}
        className="object-cover transition-transform duration-700 ease-(--ease-out) group-hover:scale-[1.03]"
      />
      <span className="sr-only">
        Open photo {i + 1} of {images.length}
      </span>
    </button>
  );

  return (
    <>
      {layout === "mosaic" ? (
        <ul className="grid grid-flow-row-dense auto-rows-[38vw] grid-cols-2 gap-2 sm:auto-rows-[22vw] sm:grid-cols-4 sm:gap-3 xl:auto-rows-[17rem]">
          {images.map((image, i) => (
            <li key={image.id} className={mosaicSpan(i)}>
              {trigger(image, i, "size-full")}
            </li>
          ))}
        </ul>
      ) : layout === "filmstrip" ? (
        <ul className="-mx-(--gutter) flex snap-x snap-mandatory [scrollbar-width:thin] gap-3 overflow-x-auto px-(--gutter) pb-4">
          {images.map((image, i) => (
            <li
              key={image.id}
              className="h-[min(60vh,32rem)] max-w-[85vw] shrink-0 snap-start"
              style={{ aspectRatio: `${image.width} / ${image.height}` }}
            >
              {trigger(image, i, "size-full")}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {images.map((image, i) => (
            <li
              key={image.id}
              className="mb-4 break-inside-avoid"
              style={{ aspectRatio: `${image.width} / ${image.height}` }}
            >
              {trigger(image, i, "size-full")}
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={dialogRef}
        aria-label="Photo viewer"
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-bg/95 p-0 text-text backdrop:bg-bg/80"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
      >
        {current ? (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between px-(--gutter) py-3">
              <p className="font-label text-xs text-muted">
                {(index ?? 0) + 1} / {images.length}
                {current.credit ? `. Photo: ${current.credit}` : ""}
              </p>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="min-h-11 min-w-11 font-label text-xs"
              >
                Close
              </button>
            </div>
            <div className="relative min-h-0 flex-1">
              <Image
                key={current.id}
                src={current.url}
                alt={current.alt}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>
            <div className="flex justify-between px-(--gutter) py-3">
              <button
                type="button"
                onClick={() => step(-1)}
                className="min-h-11 px-4 text-sm"
                aria-label="Previous photo"
              >
                ← Prev
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                className="min-h-11 px-4 text-sm"
                aria-label="Next photo"
              >
                Next →
              </button>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
