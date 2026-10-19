"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Image as ImageData } from "@/lib/media";

/** Masonry grid; a photo opens in a full-screen viewer with arrow keys. */
export function PhotoGrid({ images }: { images: ImageData[] }) {
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

  return (
    <>
      <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3">
        {images.map((image, i) => (
          <li key={image.id} className="mb-4 break-inside-avoid">
            <button
              type="button"
              onClick={() => open(i)}
              className="block w-full overflow-hidden rounded-(--radius)"
            >
              <Image
                src={image.url}
                alt={image.alt}
                width={image.width}
                height={image.height}
                priority={i < 3}
                sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
                className="h-auto w-full transition-transform duration-700 ease-(--ease-out) hover:scale-[1.02]"
              />
              <span className="sr-only">
                Open photo {i + 1} of {images.length}
              </span>
            </button>
          </li>
        ))}
      </ul>

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
              <p className="font-mono text-xs tracking-[0.14em] text-muted uppercase">
                {(index ?? 0) + 1} / {images.length}
                {current.credit ? ` · Photo: ${current.credit}` : ""}
              </p>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="min-h-11 min-w-11 font-mono text-xs tracking-[0.18em] uppercase"
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
