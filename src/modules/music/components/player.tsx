"use client";

import Image from "next/image";
import Link from "next/link";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { PreviewTrack } from "../queries";
import { formatDuration } from "../schemas";

type PlayerState = {
  current: PreviewTrack | null;
  playing: boolean;
  /** Plays `track`; `queue` (containing it) lets next/previous work. */
  play: (track: PreviewTrack, queue?: PreviewTrack[]) => void;
  toggle: () => void;
};

const PlayerContext = createContext<PlayerState | null>(null);
// Position updates many times a second; keep them out of the main context.
const TimeContext = createContext<{
  time: number;
  duration: number;
  seek: (seconds: number) => void;
  next: (() => void) | null;
  previous: (() => void) | null;
  close: () => void;
} | null>(null);

export function usePlayer() {
  const value = use(PlayerContext);
  if (!value) throw new Error("usePlayer needs <PlayerProvider>");
  return value;
}

/**
 * One audio element for the whole site, so previews keep playing while
 * visitors browse. Only public preview clips are ever loaded here.
 */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<PreviewTrack[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const current = queue[index] ?? null;

  useEffect(() => {
    const element = new Audio();
    element.preload = "metadata";
    audio.current = element;
    const onTime = () => setTime(element.currentTime);
    const onMeta = () =>
      setDuration(Number.isFinite(element.duration) ? element.duration : 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    element.addEventListener("timeupdate", onTime);
    element.addEventListener("loadedmetadata", onMeta);
    element.addEventListener("durationchange", onMeta);
    element.addEventListener("play", onPlay);
    element.addEventListener("pause", onPause);
    return () => {
      element.pause();
      element.removeEventListener("timeupdate", onTime);
      element.removeEventListener("loadedmetadata", onMeta);
      element.removeEventListener("durationchange", onMeta);
      element.removeEventListener("play", onPlay);
      element.removeEventListener("pause", onPause);
      audio.current = null;
    };
  }, []);

  // Advance through the queue when a clip ends.
  useEffect(() => {
    const element = audio.current;
    if (!element) return;
    const onEnded = () => {
      if (index < queue.length - 1) setIndex(index + 1);
      else setPlaying(false);
    };
    element.addEventListener("ended", onEnded);
    return () => element.removeEventListener("ended", onEnded);
  }, [index, queue.length]);

  // Load and start the current track whenever it changes.
  useEffect(() => {
    const element = audio.current;
    if (!element || !current) return;
    if (element.src !== current.previewUrl) {
      element.src = current.previewUrl;
      setTime(0);
      setDuration(0);
    }
    element.play().catch(() => setPlaying(false));
  }, [current]);

  // Lock-screen and headphone controls.
  useEffect(() => {
    if (!current || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artistName,
      album: current.releaseTitle,
      artwork: current.cover ? [{ src: current.cover }] : [],
    });
  }, [current]);

  const play = useCallback((track: PreviewTrack, list?: PreviewTrack[]) => {
    const nextQueue = list?.some((item) => item.id === track.id)
      ? list
      : [track];
    setQueue(nextQueue);
    setIndex(nextQueue.findIndex((item) => item.id === track.id));
    const element = audio.current;
    if (element && element.src === track.previewUrl) {
      element.play().catch(() => setPlaying(false));
    }
  }, []);

  const toggle = useCallback(() => {
    const element = audio.current;
    if (!element || !element.src) return;
    if (element.paused) element.play().catch(() => setPlaying(false));
    else element.pause();
  }, []);

  const seek = useCallback((seconds: number) => {
    if (audio.current) audio.current.currentTime = seconds;
  }, []);

  const close = useCallback(() => {
    audio.current?.pause();
    setQueue([]);
    setIndex(0);
  }, []);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.setActionHandler("play", toggle);
    navigator.mediaSession.setActionHandler("pause", toggle);
    navigator.mediaSession.setActionHandler(
      "nexttrack",
      index < queue.length - 1 ? () => setIndex(index + 1) : null,
    );
    navigator.mediaSession.setActionHandler(
      "previoustrack",
      index > 0 ? () => setIndex(index - 1) : null,
    );
  }, [index, queue.length, toggle]);

  const state = useMemo(
    () => ({ current, playing, play, toggle }),
    [current, playing, play, toggle],
  );
  const timing = useMemo(
    () => ({
      time,
      duration,
      seek,
      close,
      next: index < queue.length - 1 ? () => setIndex(index + 1) : null,
      previous: index > 0 ? () => setIndex(index - 1) : null,
    }),
    [time, duration, seek, close, index, queue.length],
  );

  return (
    <PlayerContext value={state}>
      <TimeContext value={timing}>{children}</TimeContext>
    </PlayerContext>
  );
}

function PlayIcon({ playing }: { playing: boolean }) {
  return playing ? (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5" fill="currentColor">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5" fill="currentColor">
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}

/** Round play button for cards and track lists. */
export function PlayButton({
  track,
  queue,
  label,
  size = "md",
  className = "",
}: {
  track: PreviewTrack;
  queue?: PreviewTrack[];
  /** What is played, for screen readers ("Play preview of …"). */
  label: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { current, playing, play, toggle } = usePlayer();
  const isCurrent = current?.id === track.id;
  const active = isCurrent && playing;
  const sizes = { sm: "size-9", md: "size-11", lg: "size-16" };
  return (
    <button
      type="button"
      aria-label={`${active ? "Pause" : "Play"} preview of ${label}`}
      aria-pressed={active}
      onClick={() => (isCurrent ? toggle() : play(track, queue))}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink shadow-lg shadow-black/30 transition-transform duration-200 ease-(--ease-spring) hover:scale-110 focus-visible:scale-110 ${sizes[size]} ${className}`}
    >
      <PlayIcon playing={active} />
    </button>
  );
}

/** Animated bars shown beside the track that is playing. */
export function NowPlaying({ trackId }: { trackId: string }) {
  const { current, playing } = usePlayer();
  if (current?.id !== trackId) return null;
  return (
    <span
      aria-hidden
      className={`eq-bars inline-flex h-3 items-end gap-0.5 ${playing ? "" : "eq-paused"}`}
    >
      <span />
      <span />
      <span />
    </span>
  );
}

/** The bar pinned to the bottom of the screen while a preview is loaded. */
export function PlayerBar() {
  const { current, playing, toggle } = usePlayer();
  const timing = use(TimeContext);
  if (!current || !timing) return null;
  const { time, duration, seek, next, previous, close } = timing;
  const length = duration || 0;
  const elapsed = formatDuration(time) || "0:00";
  // Length is unknown until the clip's metadata arrives.
  const total = length ? ` / ${formatDuration(length)}` : "";

  return (
    <>
      <div aria-hidden className="h-24" />
      <section
        aria-label="Music player"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line-strong/60 bg-bg/90 backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-5 sm:px-6">
          <Link
            href={current.releaseHref}
            className="relative size-12 shrink-0 overflow-hidden rounded-full bg-surface-2 ring-2 ring-accent/50 sm:size-14"
          >
            {current.cover ? (
              <Image
                src={current.cover}
                alt=""
                fill
                sizes="3.5rem"
                className={`object-cover ${playing ? "disc-spin" : "disc-spin disc-paused"}`}
              />
            ) : null}
            <span className="absolute inset-[42%] rounded-full bg-bg" />
            <span className="sr-only">Open {current.releaseTitle}</span>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate text-sm font-medium">
                {current.title}
                <span className="text-muted"> · {current.artistName}</span>
              </p>
              <p className="hidden font-label text-xs text-muted tabular-nums sm:block">
                Preview · {elapsed}
                {total}
              </p>
            </div>
            <input
              type="range"
              min={0}
              max={length || 1}
              step={0.1}
              value={length ? Math.min(time, length) : 0}
              disabled={!length}
              onChange={(event) => seek(Number(event.target.value))}
              aria-label="Position in preview"
              aria-valuetext={`${elapsed}${length ? ` of ${formatDuration(length)}` : ""}`}
              className="player-range mt-1.5 w-full"
              style={
                {
                  "--progress": `${length ? (time / length) * 100 : 0}%`,
                } as React.CSSProperties
              }
            />
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={previous ?? undefined}
              disabled={!previous}
              aria-label="Previous track"
              className="hidden size-11 items-center justify-center rounded-full text-muted hover:text-text disabled:opacity-30 sm:inline-flex"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="size-5"
                fill="currentColor"
              >
                <rect x="6" y="6" width="2" height="12" rx="1" />
                <path d="M18 6.9v10.2a.9.9 0 0 1-1.38.76L9.5 12.76a.9.9 0 0 1 0-1.52l7.12-5.1A.9.9 0 0 1 18 6.9Z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? "Pause" : "Play"}
              className="inline-flex size-12 items-center justify-center rounded-full bg-accent text-accent-ink transition-transform hover:scale-105"
            >
              <PlayIcon playing={playing} />
            </button>
            <button
              type="button"
              onClick={next ?? undefined}
              disabled={!next}
              aria-label="Next track"
              className="hidden size-11 items-center justify-center rounded-full text-muted hover:text-text disabled:opacity-30 sm:inline-flex"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="size-5"
                fill="currentColor"
              >
                <rect x="16" y="6" width="2" height="12" rx="1" />
                <path d="M6 6.9v10.2a.9.9 0 0 0 1.38.76l7.12-5.1a.9.9 0 0 0 0-1.52l-7.12-5.1A.9.9 0 0 0 6 6.9Z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={close}
              aria-label="Close player"
              className="inline-flex size-11 items-center justify-center rounded-full text-muted hover:text-text"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
