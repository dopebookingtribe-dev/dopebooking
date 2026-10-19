"use client";

import Image from "next/image";
import { useState } from "react";
import {
  embedUrl,
  providerThumbnail,
  VIDEO_PROVIDERS,
  type VideoSource,
} from "@/lib/video";

/**
 * Click-to-play facade: shows a poster and loads the provider's player only
 * when asked. Keeps pages light and sets no third-party cookies until then.
 */
export function VideoPlayer({
  source,
  title,
  poster,
  priority = false,
}: {
  source: VideoSource;
  title: string;
  poster: { url: string } | null;
  priority?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const posterUrl = poster?.url ?? providerThumbnail(source);

  return (
    <div className="relative aspect-video overflow-hidden rounded-(--radius) bg-surface-2">
      {playing ? (
        <iframe
          src={embedUrl(source)}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 size-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 flex size-full items-center justify-center"
        >
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt=""
              fill
              priority={priority}
              sizes="(min-width: 1024px) 70vw, 100vw"
              className="object-cover opacity-80 transition-opacity group-hover:opacity-100"
            />
          ) : null}
          <span className="relative flex size-20 items-center justify-center rounded-full bg-accent text-accent-ink transition-transform duration-300 group-hover:scale-110">
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className="ml-1 size-8 fill-current"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <span className="sr-only">
            Play “{title}” (loads the {VIDEO_PROVIDERS[source.provider]} player)
          </span>
        </button>
      )}
    </div>
  );
}
