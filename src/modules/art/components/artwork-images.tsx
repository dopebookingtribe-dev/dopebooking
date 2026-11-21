"use client";

import Image from "next/image";
import { useState } from "react";
import type { Image as ImageData } from "@/lib/media";
import { ArtViewer, type ViewerItem } from "./art-viewer";

/** An artwork's main image with detail views; any of them opens the viewer. */
export function ArtworkImages({
  title,
  images,
}: {
  title: string;
  images: ImageData[];
}) {
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const main = images[selected] ?? images[0];
  const items: ViewerItem[] = images.map((image, i) => ({
    id: image.id,
    url: image.url,
    alt: image.alt,
    width: image.width,
    height: image.height,
    title: i === 0 ? title : `${title}, detail ${i}`,
    credit: image.credit,
  }));

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(selected)}
        className="group relative mx-auto block max-h-[80svh] w-full cursor-zoom-in overflow-hidden bg-surface-1 shadow-[0_50px_90px_-50px_rgb(0_0_0/0.95)]"
        style={{
          aspectRatio: `${main.width} / ${main.height}`,
          maxWidth: `calc(80svh * ${main.width / main.height})`,
        }}
      >
        <Image
          key={main.id}
          src={main.url}
          alt={main.alt}
          fill
          priority
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="art-fade object-contain"
        />
        <span className="sr-only">View full screen</span>
      </button>
      {main.credit ? (
        <p className="mt-3 font-label text-xs text-muted">
          Photo: {main.credit}
        </p>
      ) : null}
      {images.length > 1 ? (
        <ul
          className="mt-6 flex flex-wrap gap-3"
          aria-label="Views of this work"
        >
          {images.map((image, i) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => setSelected(i)}
                aria-pressed={i === selected}
                aria-label={i === 0 ? "Main view" : `Detail ${i}`}
                className={`relative block size-20 overflow-hidden bg-surface-2 ring-offset-2 ring-offset-bg transition ${
                  i === selected
                    ? "ring-2 ring-accent"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                <Image
                  src={image.url}
                  alt=""
                  fill
                  sizes="5rem"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <ArtViewer items={items} index={open} onIndex={setOpen} />
    </div>
  );
}
