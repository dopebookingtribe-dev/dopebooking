"use client";

import { formatDuration } from "../schemas";
import type { PreviewTrack } from "../queries";
import { NowPlaying, PlayButton, usePlayer } from "./player";

export type TrackListItem = {
  id: string;
  position: number;
  title: string;
  duration: number | null;
  bpm: number | null;
  musicalKey: string | null;
  preview: PreviewTrack | null;
  /** For bundles: the release the track comes from. */
  from?: string;
};

/** Tracklist with previews; the whole list plays as a queue. */
export function TrackList({ tracks }: { tracks: TrackListItem[] }) {
  const { current } = usePlayer();
  const queue = tracks.flatMap((track) =>
    track.preview ? [track.preview] : [],
  );
  return (
    <ol className="divide-y divide-line border-y border-line">
      {tracks.map((track, index) => {
        const active = current?.id === track.id;
        return (
          <li
            key={track.id}
            className={`grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3 py-3 sm:grid-cols-[2.75rem_minmax(0,1fr)_5rem_6rem_3.5rem] ${active ? "text-accent" : ""}`}
          >
            {track.preview ? (
              <PlayButton
                track={track.preview}
                queue={queue}
                label={track.title}
                size="sm"
              />
            ) : (
              <span className="text-center font-label text-sm text-muted">
                {index + 1}
              </span>
            )}
            <div className="min-w-0">
              <p className="flex items-center gap-2 truncate font-medium">
                <span className="font-label text-xs text-muted tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="truncate">{track.title}</span>
                <NowPlaying trackId={track.id} />
              </p>
              {track.from ? (
                <p className="truncate text-xs text-muted">From {track.from}</p>
              ) : null}
            </div>
            <span className="hidden font-label text-xs text-muted sm:block">
              {track.bpm ? `${track.bpm} BPM` : ""}
            </span>
            <span className="hidden font-label text-xs text-muted sm:block">
              {track.musicalKey ?? ""}
            </span>
            <span className="text-right font-label text-sm text-muted tabular-nums">
              {formatDuration(track.duration)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** "Play all" for the release header. */
export function PlayAll({ tracks }: { tracks: TrackListItem[] }) {
  const { current, playing, play, toggle } = usePlayer();
  const queue = tracks.flatMap((track) =>
    track.preview ? [track.preview] : [],
  );
  if (!queue.length) return null;
  const inThis = queue.some((track) => track.id === current?.id);
  return (
    <button
      type="button"
      onClick={() => (inThis ? toggle() : play(queue[0], queue))}
      className="inline-flex min-h-11 items-center gap-3 self-start rounded-full border border-line-strong px-5 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
    >
      <span
        aria-hidden
        className="inline-flex size-6 items-center justify-center rounded-full bg-accent text-accent-ink"
      >
        {inThis && playing ? (
          <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor">
            <path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5Z" />
          </svg>
        )}
      </span>
      {inThis && playing ? "Pause previews" : "Play previews"}
    </button>
  );
}
