import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { Picture } from "@/components/ui/picture";
import { CONTAINERS } from "@/modules/media/image-specs";
import { ArtistLens } from "@/modules/artists/components/artist-card";
import { FilterLink } from "@/modules/artists/components/artist-directory";
import { getPublishedArtists } from "@/modules/artists/queries";
import { formatCents } from "@/modules/marketplace/schemas";
import {
  getMusicGenres,
  getPublishedReleases,
  getTopSellingIds,
  releaseHref,
  type Genre,
  type ReleaseCard as Card,
  type ReleaseTrack,
} from "../queries";
import { RELEASE_TYPES } from "../schemas";
import { BuyButtons } from "./buy-buttons";
import { PlayButton } from "./player";
import { ReleaseCard } from "./release-card";

const BPM_RANGES = {
  "up-to-135": { label: "Up to 135 BPM", min: 0, max: 135 },
  "136-145": { label: "136–145 BPM", min: 136, max: 145 },
  "146-up": { label: "146+ BPM", min: 146, max: 999 },
} as const;
const SORTS = {
  newest: "Newest",
  "price-low": "Price, low to high",
  "price-high": "Price, high to low",
  bpm: "BPM",
} as const;

type Filters = {
  q: string;
  genre: string;
  type: string;
  bpm: string;
  sort: keyof typeof SORTS;
};

function readFilters(params: Record<string, string | string[] | undefined>) {
  const one = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value)?.trim().slice(0, 80) ?? "";
  };
  const sort = one("sort");
  return {
    q: one("q"),
    genre: one("genre"),
    type: one("type") in RELEASE_TYPES ? one("type") : "",
    bpm: one("bpm") in BPM_RANGES ? one("bpm") : "",
    sort: (sort in SORTS ? sort : "newest") as Filters["sort"],
  };
}

function matches(
  release: Card,
  filters: Filters,
  tracks: Record<string, ReleaseTrack[]>,
  details: Record<
    string,
    { label: string | null; catalogNumber: string | null }
  >,
) {
  if (filters.type && release.type !== filters.type) return false;
  if (
    filters.genre &&
    release.genre?.slug !== filters.genre &&
    release.subgenre?.slug !== filters.genre
  ) {
    return false;
  }
  if (filters.bpm) {
    const range = BPM_RANGES[filters.bpm as keyof typeof BPM_RANGES];
    const bpms = [
      release.bpm,
      ...(tracks[release.id] ?? []).map((t) => t.bpm),
    ].filter((bpm): bpm is number => bpm !== null);
    if (!bpms.some((bpm) => bpm >= range.min && bpm <= range.max)) return false;
  }
  if (filters.q) {
    const haystack = [
      release.title,
      release.artist.name,
      release.genre?.name,
      release.subgenre?.name,
      release.musicalKey,
      details[release.id]?.label,
      details[release.id]?.catalogNumber,
      ...(tracks[release.id] ?? []).map((track) => track.title),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (
      !filters.q
        .toLowerCase()
        .split(/\s+/)
        .every((word) => haystack.includes(word))
    ) {
      return false;
    }
  }
  return true;
}

function sortReleases(list: Card[], sort: Filters["sort"]) {
  const sorted = [...list];
  const date = (r: Card) => r.releaseDate ?? r.publishedAt ?? "";
  switch (sort) {
    case "price-low":
      return sorted.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    case "price-high":
      return sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    case "bpm":
      return sorted.sort((a, b) => (a.bpm ?? 999) - (b.bpm ?? 999));
    default:
      return sorted.sort((a, b) => date(b).localeCompare(date(a)));
  }
}

export async function MusicStore({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, catalogue, genres, topIds, artists] = await Promise.all([
    searchParams,
    getPublishedReleases(),
    getMusicGenres(),
    getTopSellingIds(8),
    getPublishedArtists(),
  ]);
  const { releases, tracks, details } = catalogue;
  const filters = readFilters(params);
  const filtering = Boolean(
    filters.q || filters.genre || filters.type || filters.bpm || params.sort,
  );

  if (!releases.length) {
    return (
      <Container className="py-16">
        <div className="rounded-(--radius) border border-line p-8 sm:p-12">
          <h2 className="font-display text-4xl">
            The first releases are on their way
          </h2>
          <p className="mt-4 max-w-xl text-muted">
            DopeBooking artists are uploading their music. Check back soon, or
            if you&apos;re one of our artists, put your tracks on sale.
          </p>
          <ButtonLink
            href="/dashboard/music"
            variant="secondary"
            className="mt-8"
          >
            Sell your music
          </ButtonLink>
        </div>
      </Container>
    );
  }

  const results = filtering
    ? sortReleases(
        releases.filter((release) =>
          matches(release, filters, tracks, details),
        ),
        filters.sort,
      )
    : [];
  const byId = new Map(releases.map((release) => [release.id, release]));
  const featured = releases.filter((release) => release.featured);
  const top = topIds.flatMap((id) => {
    const release = byId.get(id);
    return release ? [release] : [];
  });
  const latest = sortReleases(releases, "newest").slice(0, 12);
  const usedGenres = topGenres(genres, releases);
  const sellingArtists = artists.filter((artist) =>
    releases.some((release) => release.artist.id === artist.id),
  );

  return (
    <Container className="py-12 sm:py-16">
      <SearchBar filters={filters} genres={genres} />

      {filtering ? (
        <section aria-labelledby="results" className="mt-12">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="results" className="font-display text-3xl">
              {results.length} {results.length === 1 ? "release" : "releases"}
            </h2>
            <Link
              href="/music"
              scroll={false}
              className="text-sm text-muted underline underline-offset-4 hover:text-text"
            >
              Clear filters
            </Link>
          </div>
          {results.length ? (
            <ReleaseGrid releases={results} />
          ) : (
            <p className="mt-8 text-muted">
              Nothing matches yet. Try fewer words or another genre.
            </p>
          )}
        </section>
      ) : (
        <div className="mt-14 flex flex-col gap-24">
          {featured.length ? <Featured releases={featured} /> : null}
          {top.length ? <Chart releases={top} /> : null}
          <section aria-labelledby="latest">
            <Meta>Fresh</Meta>
            <h2 id="latest" className="mt-3 font-display text-4xl sm:text-5xl">
              Latest releases
            </h2>
            <ReleaseGrid releases={latest} priorityFirst={!featured.length} />
          </section>
          {usedGenres.length ? (
            <section aria-labelledby="genres">
              <h2 id="genres" className="font-display text-3xl">
                Browse by sound
              </h2>
              <ul className="mt-6 flex flex-wrap gap-2">
                {usedGenres.map(({ genre, count }) => (
                  <li key={genre.id}>
                    <FilterLink
                      href={`/music?genre=${genre.slug}`}
                      active={false}
                    >
                      {genre.name}
                      <span className="ml-2 font-label text-xs text-muted">
                        {count}
                      </span>
                    </FilterLink>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {sellingArtists.length ? (
            <section aria-labelledby="music-artists">
              <h2 id="music-artists" className="font-display text-3xl">
                Artists on DopeBooking Music
              </h2>
              <ul className="mt-8 grid grid-cols-3 gap-6 sm:grid-cols-4 lg:grid-cols-6">
                {sellingArtists.map((artist) => (
                  <li key={artist.id}>
                    <Link
                      href={`/artists/${artist.slug}#music`}
                      className="group block text-center"
                    >
                      <ArtistLens
                        artist={artist}
                        sizes="(min-width: 1024px) 12vw, 28vw"
                        className="ring-1 ring-line transition-shadow group-hover:ring-accent"
                      />
                      <span className="mt-3 block truncate text-sm font-medium group-hover:text-accent">
                        {artist.stageName}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <aside className="flex flex-wrap items-center justify-between gap-6 rounded-(--radius) border border-line bg-surface-1 p-8">
            <div>
              <h2 className="font-display text-3xl">
                Are you a DopeBooking artist?
              </h2>
              <p className="mt-2 max-w-xl text-muted">
                Sell your tracks here and keep most of every sale. Upload, set
                your price and follow your earnings in one place.
              </p>
            </div>
            <ButtonLink href="/dashboard/music" variant="secondary">
              Sell your music
            </ButtonLink>
          </aside>
        </div>
      )}
    </Container>
  );
}

function topGenres(genres: Genre[], releases: Card[]) {
  return genres
    .filter((genre) => !genre.parentId)
    .map((genre) => ({
      genre,
      count: releases.filter((release) => release.genre?.id === genre.id)
        .length,
    }))
    .filter((row) => row.count > 0);
}

function SearchBar({ filters, genres }: { filters: Filters; genres: Genre[] }) {
  const parents = genres.filter((genre) => !genre.parentId);
  const select =
    "min-h-11 rounded-(--radius) border border-line-strong bg-surface-1 px-3 text-sm text-text";
  return (
    <form
      action="/music"
      role="search"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto]"
    >
      <label className="sm:col-span-2 lg:col-span-1">
        <span className="sr-only">Search music</span>
        <input
          type="search"
          name="q"
          defaultValue={filters.q}
          placeholder="Artist, track, label…"
          className="min-h-11 w-full rounded-full border border-line-strong bg-surface-1 px-5 text-base text-text placeholder:text-muted focus-visible:border-accent"
        />
      </label>
      <label>
        <span className="sr-only">Genre</span>
        <select name="genre" defaultValue={filters.genre} className={select}>
          <option value="">All genres</option>
          {parents.map((parent) => (
            <optgroup key={parent.id} label={parent.name}>
              <option value={parent.slug}>All {parent.name}</option>
              {genres
                .filter((genre) => genre.parentId === parent.id)
                .map((genre) => (
                  <option key={genre.id} value={genre.slug}>
                    {genre.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label>
        <span className="sr-only">Format</span>
        <select name="type" defaultValue={filters.type} className={select}>
          <option value="">Tracks, EPs, albums</option>
          {Object.entries(RELEASE_TYPES).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="sr-only">Tempo</span>
        <select name="bpm" defaultValue={filters.bpm} className={select}>
          <option value="">Any tempo</option>
          {Object.entries(BPM_RANGES).map(([key, range]) => (
            <option key={key} value={key}>
              {range.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="sr-only">Sort</span>
        <select name="sort" defaultValue={filters.sort} className={select}>
          {Object.entries(SORTS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="min-h-11 rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink transition-transform hover:scale-105 hover:-rotate-1"
      >
        Search
      </button>
    </form>
  );
}

function ReleaseGrid({
  releases,
  priorityFirst = false,
}: {
  releases: Card[];
  priorityFirst?: boolean;
}) {
  return (
    <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-12 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {releases.map((release, index) => (
        <li key={release.id}>
          <ReleaseCard
            release={release}
            priority={priorityFirst && index < 2}
          />
        </li>
      ))}
    </ul>
  );
}

/** The lead featured release large, the others beside it. */
function Featured({ releases }: { releases: Card[] }) {
  const [lead, ...rest] = releases;
  return (
    <section aria-labelledby="featured">
      <Meta>Picked by DopeBooking</Meta>
      <h2 id="featured" className="sr-only">
        Featured releases
      </h2>
      <div className="mt-6 grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="sleeve relative aspect-square max-w-xl">
          <div
            aria-hidden
            className="sleeve-disc absolute inset-[3%] rounded-full shadow-2xl shadow-black/60"
          />
          <Link
            href={releaseHref(lead)}
            className={`relative block ${CONTAINERS.releaseCover} overflow-hidden rounded-(--radius) bg-surface-2 shadow-2xl shadow-black/50`}
          >
            {lead.cover ? (
              <Picture
                image={lead.cover}
                decorative
                priority
                sizes="(min-width: 1024px) 40vw, 92vw"
              />
            ) : null}
            <span className="sr-only">{lead.title}</span>
          </Link>
        </div>
        <div>
          <p className="font-label text-sm text-accent">
            {RELEASE_TYPES[lead.type]}
            {(lead.subgenre ?? lead.genre)
              ? ` · ${(lead.subgenre ?? lead.genre)!.name}`
              : ""}
          </p>
          <h3 className="mt-3 font-display text-5xl leading-[0.95] sm:text-7xl">
            <Link href={releaseHref(lead)} className="hover:text-accent">
              {lead.title}
            </Link>
          </h3>
          <p className="mt-4 text-xl">
            <Link
              href={`/artists/${lead.artist.slug}`}
              className="text-muted hover:text-text"
            >
              {lead.artist.name}
            </Link>
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            {lead.firstPreview ? (
              <PlayButton
                track={lead.firstPreview}
                label={`${lead.title} by ${lead.artist.name}`}
                size="lg"
              />
            ) : null}
            <BuyButtons
              releaseId={lead.id}
              price={lead.price}
              currency={lead.currency}
              onSale={lead.onSale}
            />
          </div>
          {rest.length ? (
            <ul className="mt-12 grid grid-cols-2 gap-5 sm:grid-cols-3">
              {rest.slice(0, 3).map((release) => (
                <li key={release.id}>
                  <ReleaseCard release={release} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** Numbered top sellers, chart style. */
function Chart({ releases }: { releases: Card[] }) {
  const queue = releases.flatMap((release) =>
    release.firstPreview ? [release.firstPreview] : [],
  );
  return (
    <section aria-labelledby="top-sellers">
      <Meta>Most bought</Meta>
      <h2 id="top-sellers" className="mt-3 font-display text-4xl sm:text-5xl">
        Top sellers
      </h2>
      <ol className="mt-8 grid gap-x-10 md:grid-cols-2">
        {releases.map((release, index) => (
          <li
            key={release.id}
            className="flex items-center gap-4 border-b border-line py-3"
          >
            <span className="w-8 shrink-0 font-display text-3xl text-muted tabular-nums">
              {index + 1}
            </span>
            <Link
              href={releaseHref(release)}
              className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface-2"
            >
              {release.cover ? (
                <Picture image={release.cover} decorative sizes="3.5rem" />
              ) : null}
              <span className="sr-only">{release.title}</span>
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={releaseHref(release)}
                className="block truncate font-medium hover:text-accent"
              >
                {release.title}
              </Link>
              <p className="truncate text-sm text-muted">
                {release.artist.name}
              </p>
            </div>
            {release.price !== null ? (
              <span className="hidden font-label text-sm sm:inline">
                {formatCents(release.price, release.currency)}
              </span>
            ) : null}
            {release.firstPreview ? (
              <PlayButton
                track={release.firstPreview}
                queue={queue}
                label={`${release.title} by ${release.artist.name}`}
                size="sm"
              />
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
