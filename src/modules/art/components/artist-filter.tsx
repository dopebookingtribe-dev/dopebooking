"use client";

import { useState } from "react";
import type { ArtArtistCard } from "../queries";
import { DISCIPLINES, type Discipline } from "../schemas";
import { ArtArtistCardView } from "./artist-arch";

type Filter = "all" | "collective" | Discipline;

/**
 * The artist directory with discipline chips. Filtering happens in the
 * browser (the roster is small); the choice is kept in the URL (?d=…) so a
 * filtered view can be shared.
 */
export function ArtistFilter({
  artists,
  memberCounts,
  initial,
  showDemo,
}: {
  artists: ArtArtistCard[];
  memberCounts: Record<string, number>;
  initial: string | null;
  showDemo: boolean;
}) {
  const present = (Object.keys(DISCIPLINES) as Discipline[]).filter((key) =>
    artists.some((artist) => artist.disciplines.includes(key)),
  );
  const hasCollectives = artists.some((artist) => artist.kind === "collective");
  const valid = (value: string | null): Filter =>
    value === "collective" && hasCollectives
      ? "collective"
      : value && (present as string[]).includes(value)
        ? (value as Discipline)
        : "all";
  const [filter, setFilter] = useState<Filter>(valid(initial));

  const choose = (next: Filter) => {
    setFilter(next);
    const url = new URL(window.location.href);
    if (next === "all") url.searchParams.delete("d");
    else url.searchParams.set("d", next);
    window.history.replaceState(null, "", url);
  };

  const shown = artists.filter((artist) =>
    filter === "all"
      ? true
      : filter === "collective"
        ? artist.kind === "collective"
        : artist.disciplines.includes(filter),
  );

  const options: { key: Filter; label: string }[] = [
    { key: "all", label: "All artists" },
    ...present.map((key) => ({ key, label: DISCIPLINES[key] })),
    ...(hasCollectives
      ? [{ key: "collective" as const, label: "Collectives" }]
      : []),
  ];

  return (
    <div>
      {options.length > 2 ? (
        <div className="-mx-(--gutter) mb-12 [scrollbar-width:none] overflow-x-auto px-(--gutter)">
          <ul
            className="flex gap-2 sm:flex-wrap"
            aria-label="Filter by discipline"
          >
            {options.map((option) => (
              <li key={option.key} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={filter === option.key}
                  onClick={() => choose(option.key)}
                  className={`inline-flex min-h-11 items-center rounded-full border px-5 text-sm transition-colors ${
                    filter === option.key
                      ? "border-accent bg-accent text-accent-ink"
                      : "border-line-strong hover:border-uv hover:text-uv"
                  }`}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {shown.length} artists shown
      </p>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-14 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8">
        {shown.map((artist, i) => (
          <li key={artist.id} className="art-reveal">
            <ArtArtistCardView
              artist={artist}
              memberCount={memberCounts[artist.id]}
              priority={i < 4}
              showDemo={showDemo}
              headingLevel={2}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
