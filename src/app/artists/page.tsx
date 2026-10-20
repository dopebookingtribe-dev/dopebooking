import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { ArtistCard } from "@/modules/artists/components/artist-card";
import { getPublishedArtists } from "@/modules/artists/queries";
import { GENRES, GENRE_KEYS, isGenre } from "@/modules/artists/schemas";

export const metadata: Metadata = {
  title: "Artists",
  description:
    "The DopeBooking roster: international psytrance artists available for festivals and club nights.",
  alternates: { canonical: "/artists" },
};

export default function ArtistsPage({ searchParams }: PageProps<"/artists">) {
  return (
    <Container className="py-16 sm:py-24">
      <h1 className="max-w-4xl font-display text-display">Artists</h1>
      <p className="mt-6 max-w-xl text-lg text-muted">
        International psytrance acts for festivals, open-airs and club nights,
        from progressive sunrise sets to night-time full-on.
      </p>
      <Suspense fallback={<DirectorySkeleton />}>
        <Directory searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Directory({
  searchParams,
}: {
  searchParams: PageProps<"/artists">["searchParams"];
}) {
  const { genre } = await searchParams;
  const active = isGenre(genre) ? genre : null;
  const artists = await getPublishedArtists();

  if (!artists.length) {
    return (
      <p className="mt-16 text-muted">
        The roster is being curated. Check back soon.
      </p>
    );
  }

  const genresInRoster = GENRE_KEYS.filter((key) =>
    artists.some((artist) => artist.genres.includes(key)),
  );
  const shown = active
    ? artists.filter((artist) => artist.genres.includes(active))
    : artists;

  return (
    <>
      {genresInRoster.length > 1 ? (
        <nav aria-label="Filter by genre" className="mt-12">
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
        <ul className="mt-12 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((artist, index) => (
            <li key={artist.id}>
              <ArtistCard artist={artist} priority={index < 3} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-12 text-muted">
          No artists in this genre yet.{" "}
          <Link
            href="/artists"
            className="text-text underline underline-offset-4"
          >
            Show all
          </Link>
        </p>
      )}
    </>
  );
}

function FilterLink({
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
      className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 text-sm text-muted transition-colors hover:border-text hover:text-text aria-[current=page]:border-accent aria-[current=page]:text-accent"
    >
      {children}
    </Link>
  );
}

function DirectorySkeleton() {
  return (
    <ul
      aria-hidden
      className="mt-24 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3"
    >
      {[0, 1, 2].map((key) => (
        <li key={key}>
          <div className="aspect-[4/5] animate-pulse rounded-(--radius) bg-surface-1" />
          <div className="mt-4 h-8 w-2/3 rounded bg-surface-1" />
        </li>
      ))}
    </ul>
  );
}
