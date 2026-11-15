import Link from "next/link";
import { Picture } from "@/components/ui/picture";
import { CONTAINERS } from "@/modules/media/image-specs";
import { formatCents } from "@/modules/marketplace/schemas";
import { releaseHref, type ReleaseCard as Card } from "../queries";
import { RELEASE_TYPES } from "../schemas";
import { PlayButton } from "./player";

/** Square cover with its record peeking out on hover, and a preview button. */
export function ReleaseCard({
  release,
  priority = false,
  showArtist = true,
}: {
  release: Card;
  priority?: boolean;
  showArtist?: boolean;
}) {
  const href = releaseHref(release);
  return (
    <article className="sleeve group relative">
      <div className="relative aspect-square">
        <div
          aria-hidden
          className="sleeve-disc absolute inset-[3%] rounded-full shadow-2xl shadow-black/60"
        />
        <Link
          href={href}
          className={`relative block ${CONTAINERS.releaseCover} overflow-hidden rounded-(--radius) bg-surface-2 shadow-xl shadow-black/40`}
        >
          {release.cover ? (
            <Picture
              image={release.cover}
              decorative
              priority={priority}
              sizes="(min-width: 1024px) 20vw, (min-width: 640px) 30vw, 46vw"
              className="transition-transform duration-700 ease-(--ease-out) group-hover:scale-[1.04]"
            />
          ) : null}
          <span className="sr-only">
            {release.title}
            {showArtist ? ` by ${release.artist.name}` : ""}
          </span>
          {release.type !== "track" ? (
            <span className="absolute top-3 left-3 rounded-full bg-bg/80 px-2.5 py-0.5 font-label text-xs backdrop-blur-sm">
              {RELEASE_TYPES[release.type]}
            </span>
          ) : null}
        </Link>
        {release.firstPreview ? (
          <PlayButton
            track={release.firstPreview}
            label={`${release.title} by ${release.artist.name}`}
            className="absolute right-3 bottom-3"
          />
        ) : null}
      </div>
      <div className="mt-4 min-w-0">
        <h3 className="truncate text-lg leading-snug font-semibold">
          <Link href={href} className="hover:text-accent" tabIndex={-1}>
            {release.title}
          </Link>
        </h3>
        <p className="mt-0.5 truncate text-sm text-muted">
          {[
            showArtist ? release.artist.name : null,
            release.subgenre?.name ?? release.genre?.name,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {release.price !== null ? (
          <p className="mt-1.5 font-label text-sm text-accent">
            {formatCents(release.price, release.currency)}
          </p>
        ) : null}
      </div>
    </article>
  );
}
