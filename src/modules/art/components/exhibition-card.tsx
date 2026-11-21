import Link from "next/link";
import type { CSSProperties } from "react";
import { DemoBadge } from "@/components/ui/demo-badge";
import { Picture } from "@/components/ui/picture";
import { StringArt } from "@/components/site/string-art";
import { CONTAINERS, mobileSource } from "@/modules/media/image-specs";
import type { ArtArtistCard, ArtExhibitionCard } from "../queries";
import { formatDateRange } from "../schemas";
import { placeLabel, TimingBadge } from "./art-ui";

function names(ids: string[], artists: Map<string, ArtArtistCard>, max = 3) {
  const list = ids
    .map((id) => artists.get(id)?.name)
    .filter(Boolean) as string[];
  if (!list.length) return null;
  const shown = list.slice(0, max).join(", ");
  return list.length > max ? `${shown} and ${list.length - max} more` : shown;
}

function Cover({
  exhibition,
  sizes,
  priority,
}: {
  exhibition: ArtExhibitionCard;
  sizes: string;
  priority: boolean;
}) {
  if (!exhibition.cover) {
    return (
      <div
        aria-hidden
        className="flex size-full items-center justify-center bg-surface-1"
      >
        <StringArt variant={2} className="w-3/4 opacity-50" />
      </div>
    );
  }
  return (
    <Picture
      image={exhibition.cover}
      mobile={mobileSource(exhibition.mobileCover, "belowSm")}
      decorative
      priority={priority}
      sizes={sizes}
      className="transition-transform duration-[1.4s] ease-(--ease-out) group-hover:scale-[1.04]"
    />
  );
}

/**
 * An exhibition as a large card. "feature" spans the width with the title
 * over the photo; "default" is a framed 4:5 print with its label below.
 */
export function ExhibitionCardView({
  exhibition,
  artists,
  variant = "default",
  priority = false,
  showDemo = true,
  headingLevel = 3,
}: {
  exhibition: ArtExhibitionCard;
  artists: Map<string, ArtArtistCard>;
  variant?: "feature" | "default";
  priority?: boolean;
  showDemo?: boolean;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const href = `/art-gallery/exhibitions/${exhibition.slug}`;
  const dates = formatDateRange(
    exhibition.startsOn,
    exhibition.endsOn,
    exhibition.dateNote,
  );
  const place = placeLabel(exhibition);
  const who = names(exhibition.artistIds, artists);
  const accent = {
    "--thread": exhibition.accent ?? "var(--accent)",
  } as CSSProperties;

  if (variant === "feature") {
    return (
      <Link
        href={href}
        className="group relative block overflow-hidden rounded-(--radius)"
        style={accent}
      >
        <div
          className={`relative ${CONTAINERS.artExhibitionFeature} bg-surface-2`}
        >
          <Cover
            exhibition={exhibition}
            sizes="(min-width: 1280px) 74rem, 100vw"
            priority={priority}
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-linear-to-t from-bg via-bg/55 to-transparent sm:bg-linear-to-tr sm:from-bg/95 sm:via-bg/40"
          />
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-1 bg-(--thread)"
          />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-10 lg:p-14">
            <div className="flex flex-wrap items-center gap-2">
              <TimingBadge timing={exhibition.timing} />
              {exhibition.isDemo && showDemo ? <DemoBadge /> : null}
            </div>
            {exhibition.festival ? (
              <p className="mt-5 font-label text-sm text-text/85">
                {exhibition.festival.name}
              </p>
            ) : null}
            <Heading className="mt-2 max-w-4xl font-display text-[clamp(2.25rem,1rem+4.5vw,5.5rem)] leading-[0.95] text-balance">
              {exhibition.title}
            </Heading>
            {exhibition.subtitle ? (
              <p className="mt-3 max-w-2xl font-serif-art text-xl text-text/85 italic sm:text-2xl">
                {exhibition.subtitle}
              </p>
            ) : null}
            <p className="mt-5 font-label text-sm text-text/85">
              {[dates, place].filter(Boolean).join(" · ")}
            </p>
            {who ? (
              <p className="mt-1 hidden text-sm text-text/75 sm:block">
                With {who}
              </p>
            ) : null}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={href} className="group block" style={accent}>
      <div className="rounded-(--radius) bg-surface-1 p-2 ring-1 ring-line transition-[box-shadow] duration-500 group-hover:ring-(--thread)">
        <div
          className={`relative ${CONTAINERS.artExhibitionCard} overflow-hidden rounded-[calc(var(--radius)-0.375rem)] bg-surface-2`}
        >
          <Cover
            exhibition={exhibition}
            sizes="(min-width: 1024px) 24rem, (min-width: 640px) 45vw, 92vw"
            priority={priority}
          />
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            <TimingBadge timing={exhibition.timing} />
            {exhibition.isDemo && showDemo ? <DemoBadge /> : null}
          </div>
        </div>
      </div>
      <div className="mt-5 flex gap-4">
        <span aria-hidden className="mt-2 h-10 w-px shrink-0 bg-(--thread)" />
        <div className="min-w-0">
          {exhibition.festival ? (
            <p className="font-label text-sm text-muted">
              {exhibition.festival.name}
            </p>
          ) : null}
          <Heading className="tilt-on-hover font-display text-2xl leading-tight text-balance transition-colors group-hover:text-accent sm:text-3xl">
            {exhibition.title}
          </Heading>
          <p className="mt-2 font-label text-sm text-muted">{dates}</p>
          {place ? (
            <p className="font-label text-sm text-muted">{place}</p>
          ) : null}
          {who ? (
            <p className="mt-2 line-clamp-2 text-sm text-text/75">With {who}</p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
