import Link from "next/link";
import { DemoBadge } from "@/components/ui/demo-badge";
import { Picture } from "@/components/ui/picture";
import { countryName } from "@/lib/countries";
import type { ArtistCard as ArtistCardData } from "../queries";
import { GENRES, isGenre } from "../schemas";

export function genreLabels(genres: string[]) {
  return genres.map((genre) => (isGenre(genre) ? GENRES[genre] : genre));
}

/**
 * Portrait card with the name set over the photo. "feature" is the large
 * editorial size used for the first artist in a featured row.
 */
export function ArtistCard({
  artist,
  priority = false,
  size = "default",
  showDemo = true,
  headingLevel = 2,
}: {
  artist: ArtistCardData;
  priority?: boolean;
  size?: "default" | "feature";
  showDemo?: boolean;
  headingLevel?: 2 | 3;
}) {
  const meta = [countryName(artist.country), ...genreLabels(artist.genres)]
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const feature = size === "feature";

  return (
    <Link
      href={`/artists/${artist.slug}`}
      className="group relative block h-full overflow-hidden rounded-(--radius) bg-surface-2"
    >
      <div
        className={`relative ${feature ? "aspect-[4/5] h-full lg:aspect-auto lg:min-h-[36rem]" : "aspect-[4/5]"}`}
      >
        {artist.portrait ? (
          <Picture
            image={artist.portrait}
            decorative
            priority={priority}
            sizes={
              feature
                ? "(min-width: 1024px) 58vw, 92vw"
                : "(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
            }
            className="transition-transform duration-700 ease-(--ease-out) group-hover:scale-[1.04]"
          />
        ) : (
          <div
            aria-hidden
            className="flex size-full items-start p-6 font-display text-8xl text-line-strong"
          >
            {artist.stageName.slice(0, 1)}
          </div>
        )}
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-t from-bg via-bg/30 to-transparent"
        />
      </div>

      {artist.isDemo && showDemo ? (
        <DemoBadge className="absolute top-4 left-4" />
      ) : null}

      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
        <Heading
          className={`font-display leading-none [overflow-wrap:anywhere] ${feature ? "text-[clamp(2.4rem,1.5rem+3vw,4.5rem)]" : "text-[clamp(1.6rem,1.2rem+1vw,2rem)]"}`}
        >
          {artist.stageName}
        </Heading>
        <span
          aria-hidden
          className="mt-3 block h-px w-10 origin-left bg-accent transition-transform duration-500 ease-(--ease-out) group-hover:scale-x-[3]"
        />
        {meta ? (
          <p className="mt-3 font-label text-sm text-text/80">{meta}</p>
        ) : null}
        {feature && artist.tagline ? (
          <p className="mt-3 max-w-md text-muted">{artist.tagline}</p>
        ) : null}
      </div>
    </Link>
  );
}

/** Compact row: thumbnail, name and genres. Used beside a featured card. */
export function ArtistRow({
  artist,
  showDemo = true,
}: {
  artist: ArtistCardData;
  showDemo?: boolean;
}) {
  const meta = [countryName(artist.country), ...genreLabels(artist.genres)]
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");
  return (
    <Link
      href={`/artists/${artist.slug}`}
      className="group flex items-center gap-5 py-5"
    >
      <span className="relative block size-24 shrink-0 overflow-hidden rounded-(--radius) bg-surface-2 sm:size-28">
        {artist.portrait ? (
          <Picture
            image={artist.portrait}
            decorative
            sizes="7rem"
            className="transition-transform duration-700 ease-(--ease-out) group-hover:scale-110"
          />
        ) : null}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-2xl leading-tight [overflow-wrap:anywhere] transition-colors group-hover:text-accent">
            {artist.stageName}
          </h3>
          {artist.isDemo && showDemo ? <DemoBadge /> : null}
        </div>
        {meta ? (
          <span className="mt-1 block font-label text-sm text-muted">
            {meta}
          </span>
        ) : null}
        {artist.tagline ? (
          <span className="mt-1 block text-sm text-muted">
            {artist.tagline}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
