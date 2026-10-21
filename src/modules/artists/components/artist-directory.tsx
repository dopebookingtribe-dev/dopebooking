import Link from "next/link";
import { Container } from "@/components/ui/container";
import { getSiteSettings } from "@/modules/cms/queries";
import { getPublishedArtists } from "../queries";
import { GENRES, GENRE_KEYS, isGenre } from "../schemas";
import { ArtistCard } from "./artist-card";

export async function ArtistDirectory({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string | string[] }>;
}) {
  const { genre } = await searchParams;
  const active = isGenre(genre) ? genre : null;
  const [artists, settings] = await Promise.all([
    getPublishedArtists(),
    getSiteSettings(),
  ]);

  if (!artists.length) {
    return (
      <Container className="py-16">
        <p className="max-w-lg text-lg text-muted">
          The roster is being curated. To ask about an artist who isn&apos;t
          listed yet, send a{" "}
          <Link
            href="/services"
            className="text-text underline underline-offset-4"
          >
            service request
          </Link>
          .
        </p>
      </Container>
    );
  }

  const genresInRoster = GENRE_KEYS.filter((key) =>
    artists.some((artist) => artist.genres.includes(key)),
  );
  const shown = active
    ? artists.filter((artist) => artist.genres.includes(active))
    : artists;

  return (
    <Container className="py-12 sm:py-16">
      {genresInRoster.length > 1 ? (
        <nav aria-label="Filter by genre">
          <ul className="flex flex-wrap gap-2">
            <li>
              <FilterLink href="/artists" active={!active}>
                All
              </FilterLink>
            </li>
            {genresInRoster.map((key) => (
              <li key={key}>
                <FilterLink
                  href={`/artists?genre=${key}`}
                  active={active === key}
                >
                  {GENRES[key]}
                </FilterLink>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <p className="sr-only" role="status">
        {shown.length} {shown.length === 1 ? "artist" : "artists"} shown
      </p>
      {shown.length ? (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {shown.map((artist, index) => (
            <li key={artist.id}>
              <ArtistCard
                artist={artist}
                priority={index < 3}
                showDemo={settings.showDemoLabels}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-10 text-muted">
          No artists in this genre yet.{" "}
          <Link
            href="/artists"
            className="text-text underline underline-offset-4"
          >
            Show all
          </Link>
        </p>
      )}
    </Container>
  );
}

export function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      scroll={false}
      className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 text-sm text-muted transition-colors hover:border-text hover:text-text aria-[current=page]:border-accent aria-[current=page]:bg-accent/10 aria-[current=page]:text-accent"
    >
      {children}
    </Link>
  );
}

export function GridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Container className="py-12 sm:py-16">
      <div
        aria-hidden
        className="h-11 w-72 animate-pulse rounded-full bg-surface-1"
      />
      <ul
        aria-hidden
        className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
      >
        {Array.from({ length: count }, (_, key) => (
          <li
            key={key}
            className="aspect-[4/5] animate-pulse rounded-(--radius) bg-surface-1"
          />
        ))}
      </ul>
      <p className="sr-only">Loading…</p>
    </Container>
  );
}
