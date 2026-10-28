import Link from "next/link";
import { ViewTransition } from "react";
import { DemoBadge } from "@/components/ui/demo-badge";
import { Picture } from "@/components/ui/picture";
import { countryName } from "@/lib/countries";
import type { ArtistCard as ArtistCardData } from "../queries";
import { GENRES, isGenre } from "../schemas";

export function genreLabels(genres: string[]) {
  return genres.map((genre) => (isGenre(genre) ? GENRES[genre] : genre));
}

/** The round portrait shared by cards and the profile page (it morphs). */
export function ArtistLens({
  artist,
  sizes,
  priority = false,
  className = "",
}: {
  artist: Pick<ArtistCardData, "slug" | "stageName" | "portrait">;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <ViewTransition
      name={`artist-lens-${artist.slug}`}
      share="lens-morph"
      default="none"
    >
      <div
        className={`relative aspect-square overflow-hidden rounded-full bg-surface-2 ${className}`}
      >
        {artist.portrait ? (
          <Picture
            image={artist.portrait}
            decorative
            priority={priority}
            sizes={sizes}
            className="transition-transform duration-[1.2s] ease-(--ease-out) group-hover:scale-110 group-hover:rotate-3"
          />
        ) : (
          <div
            aria-hidden
            className="flex size-full items-center justify-center font-display text-8xl text-line-strong"
          >
            {artist.stageName.slice(0, 1)}
          </div>
        )}
      </div>
    </ViewTransition>
  );
}

/**
 * An artist seen through a lens: a round portrait whose ring opens when
 * pointed at, with the name below. "feature" is the large editorial size.
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
      className={`group relative mx-auto block text-center ${feature ? "max-w-[34rem]" : "max-w-[22rem]"}`}
    >
      <div className="relative rounded-full outline-2 outline-offset-[10px] outline-line transition-[outline-color,outline-offset] duration-500 ease-(--ease-out) group-hover:outline-offset-[18px] group-hover:outline-accent">
        <ArtistLens
          artist={artist}
          priority={priority}
          sizes={
            feature
              ? "(min-width: 1024px) 34rem, 85vw"
              : "(min-width: 1024px) 22rem, (min-width: 640px) 42vw, 80vw"
          }
        />
        {artist.isDemo && showDemo ? (
          <DemoBadge className="absolute top-[8%] left-[8%]" />
        ) : null}
      </div>

      <Heading
        className={`tilt-on-hover mt-9 font-display leading-[0.95] [overflow-wrap:anywhere] transition-colors group-hover:text-accent ${feature ? "text-[clamp(2.2rem,1.4rem+2.6vw,3.75rem)]" : "text-[clamp(1.6rem,1.2rem+1vw,2.1rem)]"}`}
      >
        {artist.stageName}
      </Heading>
      {meta ? <p className="mt-2 font-label text-muted">{meta}</p> : null}
      {feature && artist.tagline ? (
        <p className="mx-auto mt-3 max-w-md text-muted">{artist.tagline}</p>
      ) : null}
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
      <span className="relative block size-24 shrink-0 overflow-hidden rounded-full bg-surface-2 outline-2 outline-offset-4 outline-line transition-[outline-color] duration-300 group-hover:outline-accent sm:size-28">
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
          <h3 className="tilt-on-hover font-display text-2xl leading-tight [overflow-wrap:anywhere] transition-colors group-hover:text-accent">
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
