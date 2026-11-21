"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, type CSSProperties } from "react";
import type { ArtworkCard } from "../queries";

/** How far each column drifts with the pointer (px); odd ones counter-move. */
const DEPTH = [9, -6, 13];
/** Column offsets give the salon hang its rhythm. */
const OFFSET = ["pt-14", "pt-0", "pt-24"];

/**
 * Featured artworks hung like a salon wall: framed, at their own shapes,
 * in three staggered columns that drift slightly with the pointer (depth).
 * On phones the wall becomes a strip you can swipe.
 */
export function HeroWall({ works }: { works: ArtworkCard[] }) {
  const wallRef = useRef<HTMLDivElement>(null);
  const hung = works.filter((work) => work.image);
  const columns: ArtworkCard[][] = [[], [], []];
  hung.forEach((work, i) => columns[i % 3].push(work));

  useEffect(() => {
    const wall = wallRef.current;
    const host = wall?.closest("section");
    if (!wall || !host) return;
    if (
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !matchMedia("(hover: hover)").matches
    ) {
      return;
    }
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = host.getBoundingClientRect();
        const x = ((event.clientX - box.left) / box.width) * 2 - 1;
        const y = ((event.clientY - box.top) / box.height) * 2 - 1;
        wall.style.setProperty("--wall-x", x.toFixed(3));
        wall.style.setProperty("--wall-y", y.toFixed(3));
      });
    };
    const onLeave = () => {
      wall.style.setProperty("--wall-x", "0");
      wall.style.setProperty("--wall-y", "0");
    };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const frameFor = (
    work: ArtworkCard,
    order: number,
    sizes: string,
    priority: boolean,
  ) => (
    <Link
      key={work.id}
      href={`/art-gallery/works/${work.slug}`}
      className="art-hang group block"
      style={{ "--i": order } as CSSProperties}
    >
      <span className="block bg-surface-1 p-1.5 shadow-[0_40px_70px_-35px_rgb(0_0_0/0.95)] ring-1 ring-text/10 transition-[box-shadow] duration-500 group-hover:ring-accent/70">
        <span
          className="relative block overflow-hidden bg-surface-2"
          style={{
            aspectRatio: `${work.image!.width} / ${work.image!.height}`,
          }}
        >
          <Image
            src={work.image!.url}
            alt={work.image!.alt}
            fill
            priority={priority}
            sizes={sizes}
            className="object-contain"
          />
        </span>
      </span>
      <span className="mt-2 block truncate font-label text-xs text-muted transition-colors group-hover:text-text">
        <span className="font-serif-art text-sm text-text/90 italic">
          {work.title}
        </span>
        {work.credits[0]
          ? ` · ${work.credits.map((c) => c.artist.name).join(" & ")}`
          : ""}
      </span>
    </Link>
  );

  return (
    <>
      {/* Phones and small tablets: a strip to swipe. */}
      <div className="-mx-(--gutter) lg:hidden">
        <ul className="flex snap-x snap-mandatory scroll-px-(--gutter) [scrollbar-width:none] items-end gap-4 overflow-x-auto px-(--gutter) pb-2">
          {hung.map((work, i) => (
            <li
              key={work.id}
              className="w-[min(62vw,18rem)] shrink-0 snap-start"
            >
              {frameFor(work, i, "62vw", i < 2)}
            </li>
          ))}
        </ul>
      </div>

      {/* Large screens: the salon wall. */}
      <div
        ref={wallRef}
        aria-label="Featured artworks"
        role="group"
        className="relative hidden grid-cols-3 items-start gap-6 lg:grid xl:gap-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-10 -top-24 h-64 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--accent)_14%,transparent),transparent_70%)]"
        />
        {columns.map((column, c) => (
          <div
            key={c}
            className={`flex flex-col gap-8 ${OFFSET[c]} [translate:calc(var(--wall-x,0)*var(--depth)*1px)_calc(var(--wall-y,0)*var(--depth)*1px)] transition-[translate] duration-700 ease-(--ease-out)`}
            style={{ "--depth": DEPTH[c] } as CSSProperties}
          >
            {column.map((work, r) =>
              frameFor(
                work,
                r * 3 + c,
                "(min-width: 1280px) 15rem, 12rem",
                r === 0,
              ),
            )}
          </div>
        ))}
      </div>
    </>
  );
}
