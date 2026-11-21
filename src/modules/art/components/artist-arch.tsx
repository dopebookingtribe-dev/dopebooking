import Link from "next/link";
import { DemoBadge } from "@/components/ui/demo-badge";
import { Picture } from "@/components/ui/picture";
import { countryName } from "@/lib/countries";
import { CONTAINERS } from "@/modules/media/image-specs";
import type { ArtArtistCard } from "../queries";
import { disciplineLabels, ROLES, type Role } from "../schemas";

/** A portrait in an arch, like a niche in a gallery wall. */
export function ArtistArch({
  artist,
  sizes,
  priority = false,
  className = "",
}: {
  artist: Pick<ArtArtistCard, "name" | "portrait">;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative ${CONTAINERS.artArch} overflow-hidden rounded-t-full rounded-b-lg bg-surface-2 ${className}`}
    >
      {artist.portrait ? (
        <Picture
          image={artist.portrait}
          decorative
          priority={priority}
          sizes={sizes}
          className="transition-transform duration-[1.2s] ease-(--ease-out) group-hover:scale-[1.06]"
        />
      ) : (
        <div
          aria-hidden
          className="flex size-full items-end justify-center pb-[18%] font-serif-art text-[clamp(4rem,12vw,8rem)] text-line-strong italic"
        >
          {artist.name.slice(0, 1)}
        </div>
      )}
      {/* Inner keyline: the niche's edge. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-2 rounded-t-full rounded-b-md border border-text/15 transition-colors duration-500 group-hover:border-accent/70"
      />
    </div>
  );
}

export function artistMeta(artist: Pick<ArtArtistCard, "basedIn" | "country">) {
  return [artist.basedIn, countryName(artist.country)]
    .filter(Boolean)
    .join(", ");
}

/** Artist card: arch portrait, name, disciplines and place; optional roles. */
export function ArtArtistCardView({
  artist,
  roles,
  note,
  memberCount,
  priority = false,
  showDemo = true,
  headingLevel = 3,
  sizes = "(min-width: 1024px) 18rem, (min-width: 640px) 30vw, 45vw",
}: {
  artist: ArtArtistCard;
  roles?: Role[];
  note?: string | null;
  memberCount?: number;
  priority?: boolean;
  showDemo?: boolean;
  headingLevel?: 2 | 3;
  sizes?: string;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const disciplines = disciplineLabels(artist.disciplines).slice(0, 3);
  const place = artistMeta(artist);
  return (
    <Link href={`/art-gallery/artists/${artist.slug}`} className="group block">
      <div className="relative">
        <ArtistArch artist={artist} sizes={sizes} priority={priority} />
        {artist.isDemo && showDemo ? (
          <DemoBadge className="absolute bottom-3 left-3" />
        ) : null}
      </div>
      <Heading className="tilt-on-hover mt-5 font-display text-2xl leading-tight transition-colors group-hover:text-accent">
        {artist.name}
      </Heading>
      {artist.stageName ? (
        <p className="font-serif-art text-lg text-text/80 italic">
          {artist.stageName}
        </p>
      ) : null}
      {roles?.length ? (
        <p className="mt-2 font-label text-sm text-accent">
          {roles.map((role) => ROLES[role].label).join(" · ")}
        </p>
      ) : null}
      {note ? <p className="mt-1 text-sm text-muted">{note}</p> : null}
      <p className="mt-2 font-label text-sm text-muted">
        {artist.kind === "collective"
          ? `Collective${memberCount ? ` of ${memberCount}` : ""}`
          : disciplines.join(", ")}
      </p>
      {place ? <p className="font-label text-sm text-muted">{place}</p> : null}
    </Link>
  );
}
