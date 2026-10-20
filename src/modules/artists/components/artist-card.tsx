import Image from "next/image";
import Link from "next/link";
import { countryName } from "@/lib/countries";
import type { ArtistCard as ArtistCardData } from "../queries";
import { GENRES, isGenre } from "../schemas";

export function genreLabels(genres: string[]) {
  return genres.map((genre) => (isGenre(genre) ? GENRES[genre] : genre));
}

export function ArtistCard({
  artist,
  priority = false,
}: {
  artist: ArtistCardData;
  priority?: boolean;
}) {
  const meta = [countryName(artist.country), ...genreLabels(artist.genres)]
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");

  return (
    <Link href={`/artists/${artist.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-(--radius) bg-surface-2">
        {artist.portrait ? (
          <Image
            src={artist.portrait.url}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
            className="object-cover transition-transform duration-700 ease-(--ease-out) group-hover:scale-[1.03]"
          />
        ) : (
          <div
            aria-hidden
            className="flex size-full items-end p-5 font-display text-7xl text-line-strong"
          >
            {artist.stageName.slice(0, 1)}
          </div>
        )}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-bg/80 to-transparent"
        />
      </div>
      <h2 className="mt-4 font-display text-3xl transition-colors group-hover:text-accent">
        {artist.stageName}
      </h2>
      {meta ? (
        <p className="mt-1 font-label text-xs text-muted">{meta}</p>
      ) : null}
    </Link>
  );
}
