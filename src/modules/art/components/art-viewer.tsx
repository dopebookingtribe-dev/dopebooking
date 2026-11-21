"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";

export type ViewerItem = {
  id: string;
  url: string;
  alt: string;
  width: number;
  height: number;
  /** Artwork title (shown in the wall label). */
  title?: string | null;
  credits?: { name: string; href: string }[];
  /** Year, medium, dimensions… */
  lines?: string[];
  description?: string | null;
  href?: string | null;
  /** Photographer. */
  credit?: string | null;
};

/**
 * Full-screen viewer for artworks and exhibition photos. Arrow keys, swipe
 * and buttons step through; a click zooms in where you point (and a second
 * click zooms out); Escape closes. The wall label stays beside the work on
 * large screens and folds under it on phones.
 */
export function ArtViewer({
  items,
  index,
  onIndex,
  label = "Artwork viewer",
}: {
  items: ViewerItem[];
  index: number | null;
  onIndex: (index: number | null) => void;
  label?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const current = index === null ? null : items[index];

  const step = useCallback(
    (delta: number) => {
      if (index === null || items.length < 2) return;
      setZoom(null);
      onIndex((index + delta + items.length) % items.length);
    },
    [index, items.length, onIndex],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (index !== null && !dialog.open) dialog.showModal();
    if (index === null && dialog.open) dialog.close();
  }, [index]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    const onClose = () => {
      setZoom(null);
      onIndex(null);
    };
    dialog.addEventListener("keydown", onKey);
    dialog.addEventListener("close", onClose);
    return () => {
      dialog.removeEventListener("keydown", onKey);
      dialog.removeEventListener("close", onClose);
    };
  }, [step, onIndex]);

  const point = (event: PointerEvent<HTMLElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) / box.width) * 100,
      y: ((event.clientY - box.top) / box.height) * 100,
    };
  };

  const hasLabel = !!(
    current?.title ||
    current?.lines?.length ||
    current?.credits?.length
  );

  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-bg/[0.97] p-0 text-text backdrop:bg-bg/80"
    >
      {current ? (
        <div className="flex h-full flex-col lg:flex-row">
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between gap-4 px-(--gutter) py-3">
              <p className="font-label text-xs text-muted" aria-live="polite">
                {(index ?? 0) + 1} / {items.length}
                {current.credit ? ` · Photo: ${current.credit}` : ""}
              </p>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full font-label text-sm hover:text-accent"
              >
                Close
              </button>
            </div>
            <div
              className={`relative min-h-0 flex-1 overflow-hidden ${zoom ? "cursor-zoom-out" : "cursor-zoom-in"}`}
              onPointerDown={(event) => {
                swipe.current = { x: event.clientX, y: event.clientY };
              }}
              onPointerUp={(event) => {
                const start = swipe.current;
                swipe.current = null;
                if (!start) return;
                const dx = event.clientX - start.x;
                const dy = event.clientY - start.y;
                if (!zoom && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
                  step(dx < 0 ? 1 : -1);
                  return;
                }
                if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
                  setZoom(zoom ? null : point(event));
                }
              }}
              onPointerMove={(event) => {
                if (zoom && event.pointerType === "mouse")
                  setZoom(point(event));
              }}
            >
              <Image
                key={current.id}
                src={current.url}
                alt={current.alt}
                fill
                sizes={hasLabel ? "(min-width: 1024px) 75vw, 100vw" : "100vw"}
                draggable={false}
                style={
                  zoom
                    ? {
                        transform: "scale(2.2)",
                        transformOrigin: `${zoom.x}% ${zoom.y}%`,
                      }
                    : undefined
                }
                className="art-fade object-contain transition-transform duration-500 ease-(--ease-out) select-none"
              />
            </div>
            <div className="flex items-center justify-between px-(--gutter) py-2">
              <button
                type="button"
                onClick={() => step(-1)}
                disabled={items.length < 2}
                className="inline-flex min-h-11 items-center gap-2 px-2 text-sm hover:text-accent disabled:opacity-30"
                aria-label="Previous"
              >
                <span aria-hidden>←</span> Prev
              </button>
              <p className="hidden font-label text-xs text-muted sm:block">
                Click to zoom · arrow keys to browse
              </p>
              {hasLabel ? (
                <button
                  type="button"
                  onClick={() => setInfoOpen((open) => !open)}
                  aria-expanded={infoOpen}
                  className="inline-flex min-h-11 items-center px-2 text-sm hover:text-accent lg:hidden"
                >
                  {infoOpen ? "Hide label" : "Label"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => step(1)}
                disabled={items.length < 2}
                className="inline-flex min-h-11 items-center gap-2 px-2 text-sm hover:text-accent disabled:opacity-30"
                aria-label="Next"
              >
                Next <span aria-hidden>→</span>
              </button>
            </div>
          </div>

          {hasLabel ? (
            <aside
              className={`${infoOpen ? "block" : "hidden"} max-h-[40dvh] overflow-y-auto border-t border-line bg-surface-1 px-(--gutter) py-6 lg:block lg:max-h-none lg:w-[22rem] lg:border-t-0 lg:border-l lg:px-8 lg:py-16`}
            >
              {current.title ? (
                <h2 className="font-serif-art text-3xl leading-tight italic">
                  {current.title}
                </h2>
              ) : null}
              {current.credits?.length ? (
                <p className="mt-3 text-lg">
                  {current.credits.map((person, i) => (
                    <span key={person.href}>
                      {i
                        ? i === current.credits!.length - 1
                          ? " & "
                          : ", "
                        : ""}
                      <Link
                        href={person.href}
                        className="underline decoration-line-strong underline-offset-4 hover:text-accent"
                      >
                        {person.name}
                      </Link>
                    </span>
                  ))}
                </p>
              ) : null}
              {current.lines?.length ? (
                <ul className="mt-4 flex flex-col gap-1 font-label text-sm text-muted">
                  {current.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
              {current.description ? (
                <p className="mt-6 line-clamp-[10] text-sm leading-relaxed text-text/85">
                  {current.description}
                </p>
              ) : null}
              {current.href ? (
                <Link
                  href={current.href}
                  className="mt-8 inline-flex min-h-11 items-center text-sm underline decoration-line-strong underline-offset-[6px] hover:text-uv"
                >
                  Open the artwork page
                </Link>
              ) : null}
            </aside>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}
