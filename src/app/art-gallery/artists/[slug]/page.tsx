import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TiltHeading } from "@/components/site/tilt-heading";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { DemoBadge } from "@/components/ui/demo-badge";
import { Picture } from "@/components/ui/picture";
import {
  ArtHeader,
  ArtParagraphs,
  ArtShell,
  JsonLd,
  siteUrl,
  TimingBadge,
} from "@/modules/art/components/art-ui";
import {
  ArtArtistCardView,
  ArtistArch,
  artistMeta,
} from "@/modules/art/components/artist-arch";
import { ArtworkGrid } from "@/modules/art/components/artwork-grid";
import {
  collaborationWeight,
  collaborations,
  getArtArtist,
  getArtCatalog,
} from "@/modules/art/queries";
import {
  ART_LINK_PLATFORMS,
  disciplineLabels,
  formatDateRange,
  ROLES,
} from "@/modules/art/schemas";
import { getSiteSettings } from "@/modules/cms/queries";
import { PhotoGrid } from "@/modules/galleries/components/photo-grid";
import { VideoCard } from "@/modules/videos/components/video-card";
import { getPublishedVideos } from "@/modules/videos/queries";

type Props = PageProps<"/art-gallery/artists/[slug]">;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getArtArtist(slug);
  if (!artist) return { title: "Artist not found" };
  const description =
    artist.seoDescription ??
    artist.tagline ??
    artist.bio?.slice(0, 155) ??
    `${artist.name}: ${disciplineLabels(artist.disciplines).join(", ")}. DopeBooking Art Gallery.`;
  return {
    title: artist.seoTitle ?? artist.name,
    description,
    alternates: { canonical: `/art-gallery/artists/${artist.slug}` },
    openGraph: {
      title: `${artist.name} | DopeBooking Art Gallery`,
      description,
      type: "profile",
      images: artist.portrait
        ? [
            {
              url: artist.portrait.url,
              width: artist.portrait.width,
              height: artist.portrait.height,
              alt: artist.portrait.alt,
            },
          ]
        : undefined,
    },
  };
}

export default function ArtArtistPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div aria-hidden className="min-h-[70svh] animate-pulse bg-surface-1" />
      }
    >
      <Profile params={params} />
    </Suspense>
  );
}

async function Profile({ params }: { params: Props["params"] }) {
  const { slug } = await params;
  const [artist, catalog, settings] = await Promise.all([
    getArtArtist(slug),
    getArtCatalog(),
    getSiteSettings(),
  ]);
  if (!artist) notFound();
  const videos = await getPublishedVideos({ artArtistId: artist.id });

  const artistById = new Map(catalog.artists.map((a) => [a.id, a]));
  const works = catalog.works.filter((w) =>
    w.credits.some((c) => c.artist.id === artist.id),
  );
  const shows = catalog.participations
    .filter((p) => p.artistId === artist.id)
    .flatMap((p) => {
      const exhibition = catalog.exhibitions.find(
        (e) => e.id === p.exhibitionId,
      );
      return exhibition ? [{ ...p, exhibition }] : [];
    })
    .sort((a, b) =>
      (b.exhibition.startsOn ?? "9999").localeCompare(
        a.exhibition.startsOn ?? "9999",
      ),
    );
  const members = (catalog.members[artist.id] ?? []).flatMap((id) => {
    const member = artistById.get(id);
    return member ? [member] : [];
  });
  const collectives = Object.entries(catalog.members)
    .filter(([, list]) => list.includes(artist.id))
    .flatMap(([id]) => {
      const collective = artistById.get(id);
      return collective ? [collective] : [];
    });
  const collaborators = collaborations(catalog)
    .filter((c) => c.a === artist.id || c.b === artist.id)
    .sort((x, y) => collaborationWeight(y) - collaborationWeight(x))
    .flatMap((c) => {
      const other = artistById.get(c.a === artist.id ? c.b : c.a);
      return other ? [{ other, link: c }] : [];
    })
    .slice(0, 8);
  const festivals = [
    ...new Set(
      shows.flatMap((s) =>
        s.exhibition.festival ? [s.exhibition.festival.name] : [],
      ),
    ),
  ];
  const banner = artist.cover ?? works.find((w) => w.image)?.image ?? null;
  const disciplines = disciplineLabels(artist.disciplines);
  const place = artistMeta(artist);
  const invite = `/art-gallery/collaborate?artist=${artist.slug}#inquiry`;
  const others = catalog.artists
    .filter(
      (a) =>
        a.id !== artist.id && !collaborators.some((c) => c.other.id === a.id),
    )
    .slice(0, 4);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": artist.kind === "collective" ? "Organization" : "Person",
    name: artist.name,
    alternateName: artist.stageName ?? undefined,
    url: siteUrl(`/art-gallery/artists/${artist.slug}`),
    image: artist.portrait?.url,
    description: artist.tagline ?? artist.bio?.slice(0, 300) ?? undefined,
    ...(artist.kind === "collective"
      ? {
          member: members.map((m) => ({
            "@type": "Person",
            name: m.name,
            url: siteUrl(`/art-gallery/artists/${m.slug}`),
          })),
        }
      : {
          jobTitle: disciplines[0] ?? "Visual artist",
          knowsAbout: disciplines,
        }),
    homeLocation: artist.country
      ? {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            addressLocality: artist.basedIn ?? undefined,
            addressCountry: artist.country,
          },
        }
      : undefined,
    sameAs: [
      ...artist.links.map((l) => l.url),
      ...(artist.websiteUrl ? [artist.websiteUrl] : []),
    ],
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      {/* Header: a mood band from the cover, the arch portrait over it */}
      <section className="relative isolate overflow-hidden border-b border-line">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 -z-20 h-[22rem] sm:h-[26rem] lg:h-[min(70svh,36rem)]"
        >
          {banner ? (
            <Picture image={banner} decorative priority sizes="100vw" />
          ) : null}
          <div className="absolute inset-0 bg-linear-to-b from-bg/40 via-bg/75 to-bg" />
        </div>
        <Container className="grid gap-10 pt-12 pb-16 sm:pt-16 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:items-end md:gap-14 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:pt-40">
          <div className="max-w-[17.5rem] md:max-w-none">
            <Link
              href="/art-gallery/artists"
              className="text-sm text-text/80 hover:text-text md:hidden"
            >
              ← All artists
            </Link>
            <ArtistArch
              artist={artist}
              priority
              sizes="(min-width: 1024px) 24rem, (min-width: 768px) 20rem, 70vw"
              className="mt-6 shadow-[0_40px_80px_-40px_rgb(0_0_0/0.9)] md:mt-0"
            />
            {artist.portrait?.credit ? (
              <p className="mt-3 font-label text-xs text-muted">
                Photo: {artist.portrait.credit}
              </p>
            ) : null}
          </div>
          <div className="pb-2">
            <Link
              href="/art-gallery/artists"
              className="hidden text-sm text-text/80 hover:text-text md:inline"
            >
              ← All artists
            </Link>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <p className="font-label text-sm text-accent">
                {artist.kind === "collective"
                  ? "Collective"
                  : disciplines.slice(0, 3).join(", ") || "Artist"}
              </p>
              {artist.isDemo && settings.showDemoLabels ? <DemoBadge /> : null}
            </div>
            <TiltHeading className="mt-3 text-[clamp(2.75rem,1rem+6vw,7rem)] leading-[0.92] text-balance">
              {artist.name}
            </TiltHeading>
            {artist.stageName ? (
              <p className="mt-2 font-serif-art text-2xl text-text/85 italic">
                also known as {artist.stageName}
              </p>
            ) : null}
            {artist.tagline ? (
              <p className="mt-6 max-w-2xl text-xl text-text/85">
                {artist.tagline}
              </p>
            ) : null}
            {place ? (
              <p className="mt-4 font-label text-muted">{place}</p>
            ) : null}
            <div className="mt-8 flex flex-wrap gap-3">
              {artist.inquiriesEnabled ? (
                <ButtonLink href={invite} size="lg">
                  Invite to your festival
                </ButtonLink>
              ) : null}
              {works.length ? (
                <ButtonLink href="#portfolio" variant="secondary" size="lg">
                  View portfolio
                </ButtonLink>
              ) : null}
            </div>
          </div>
        </Container>
      </section>

      {artist.statement ? (
        <section
          aria-labelledby="statement-heading"
          className="border-b border-line py-20 sm:py-28"
        >
          <Container>
            <h2
              id="statement-heading"
              className="font-label text-sm text-accent"
            >
              Artist statement
            </h2>
            <blockquote className="relative mt-6 max-w-5xl">
              <span
                aria-hidden
                className="absolute -top-10 -left-2 font-serif-art text-[8rem] leading-none text-accent/30 select-none sm:-left-10"
              >
                “
              </span>
              <div className="flex flex-col gap-5 font-serif-art text-[clamp(1.75rem,1rem+2.2vw,3rem)] leading-[1.15] text-balance italic">
                <ArtParagraphs text={artist.statement} />
              </div>
            </blockquote>
          </Container>
        </section>
      ) : null}

      <Container className="grid gap-14 py-16 sm:py-24 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:gap-20">
        <div>
          {artist.bio ? (
            <section aria-labelledby="bio-heading">
              <h2 id="bio-heading" className="font-display text-headline">
                Biography
              </h2>
              <div className="mt-8 flex max-w-[64ch] flex-col gap-5 text-lg leading-relaxed text-text/90">
                <ArtParagraphs text={artist.bio} />
              </div>
            </section>
          ) : null}
          {artist.techniques ? (
            <section aria-labelledby="style-heading" className="mt-14">
              <h2 id="style-heading" className="font-display text-2xl">
                Style and techniques
              </h2>
              <div className="mt-5 flex max-w-[64ch] flex-col gap-4 text-text/85">
                <ArtParagraphs text={artist.techniques} />
              </div>
            </section>
          ) : null}
          {!artist.bio && !artist.techniques ? (
            <p className="text-lg text-muted">
              A full biography is coming soon.
            </p>
          ) : null}
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
          <dl className="rounded-(--radius) border border-line bg-surface-1 p-6 sm:p-8">
            {[
              ["Disciplines", disciplines.join(", ")],
              ["Specialisation", artist.specialization],
              ["Based in", place],
              ["Exhibitions", shows.length ? String(shows.length) : null],
              ["Festivals", festivals.join(", ")],
            ]
              .filter((row): row is [string, string] => !!row[1])
              .map(([term, value]) => (
                <div
                  key={term}
                  className="border-b border-line py-3 first:pt-0 last:border-b-0 last:pb-0"
                >
                  <dt className="font-label text-xs text-muted">{term}</dt>
                  <dd className="mt-1">{value}</dd>
                </div>
              ))}
          </dl>
          {artist.links.length || artist.websiteUrl ? (
            <div>
              <h2 className="font-label text-sm text-muted">Follow</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {artist.websiteUrl ? (
                  <li>
                    <a
                      href={artist.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-5 text-sm hover:border-accent hover:text-accent"
                    >
                      Website{" "}
                      <span aria-hidden className="text-muted">
                        ↗
                      </span>
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </li>
                ) : null}
                {artist.links.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-5 text-sm hover:border-accent hover:text-accent"
                    >
                      {ART_LINK_PLATFORMS[link.platform]}{" "}
                      <span aria-hidden className="text-muted">
                        ↗
                      </span>
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {artist.musicArtist ? (
            <Link
              href={`/artists/${artist.musicArtist.slug}`}
              className="group rounded-(--radius) border border-line p-5 hover:border-uv"
            >
              <span className="font-label text-xs text-muted">
                Also on our music roster
              </span>
              <span className="mt-1 block font-display text-xl group-hover:text-uv">
                {artist.musicArtist.stageName} →
              </span>
            </Link>
          ) : null}
          {artist.inquiriesEnabled ? (
            <div className="rounded-(--radius) border border-line p-5">
              <p className="text-muted">
                Bring {artist.name} to your festival, gallery or event: live
                painting, an installation or a place in a group show.
              </p>
              <ButtonLink
                href={invite}
                variant="secondary"
                className="mt-4 w-full"
              >
                Send an inquiry
              </ButtonLink>
            </div>
          ) : null}
        </aside>
      </Container>

      {members.length || collectives.length ? (
        <ArtShell
          id="collective"
          label={members.length ? "Members" : "Collectives"}
          band
        >
          <ArtHeader
            heading={
              members.length
                ? "Members"
                : `Part of ${collectives.length === 1 ? "a collective" : "collectives"}`
            }
            body={
              members.length
                ? `${artist.name} brings together ${plural(members.length, "artist")}.`
                : undefined
            }
          />
          <ul className="grid grid-cols-2 gap-x-4 gap-y-14 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8">
            {(members.length ? members : collectives).map((a) => (
              <li key={a.id}>
                <ArtArtistCardView
                  artist={a}
                  showDemo={settings.showDemoLabels}
                  memberCount={catalog.members[a.id]?.length}
                />
              </li>
            ))}
          </ul>
        </ArtShell>
      ) : null}

      {works.length ? (
        <ArtShell id="portfolio" label="Portfolio">
          <ArtHeader
            heading="Portfolio"
            body={`${plural(works.length, "work")} shown in our galleries. Shared works name every artist.`}
          />
          <ArtworkGrid works={works} showDemo={settings.showDemoLabels} />
        </ArtShell>
      ) : null}

      {shows.length ? (
        <ArtShell
          id="exhibitions"
          label="Exhibitions and festival appearances"
          band
        >
          <ArtHeader heading="Exhibitions and festivals" />
          <ol className="divide-y divide-line border-y border-line">
            {shows.map(({ exhibition, roles, note }) => (
              <li key={exhibition.id}>
                <Link
                  href={`/art-gallery/exhibitions/${exhibition.slug}`}
                  className="group grid gap-2 py-6 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:items-baseline sm:gap-8"
                >
                  <span className="font-display text-3xl text-accent">
                    {exhibition.startsOn?.slice(0, 4) ?? "TBA"}
                  </span>
                  <span>
                    <span className="block font-display text-2xl transition-colors group-hover:text-accent">
                      {exhibition.title}
                    </span>
                    <span className="mt-1 block font-label text-sm text-muted">
                      {[
                        exhibition.festival?.name,
                        formatDateRange(
                          exhibition.startsOn,
                          exhibition.endsOn,
                          exhibition.dateNote,
                        ),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    <span className="mt-1 block text-sm text-text/80">
                      {roles.map((r) => ROLES[r].label).join(", ")}
                      {note ? ` · ${note}` : ""}
                    </span>
                  </span>
                  <TimingBadge
                    timing={exhibition.timing}
                    className="justify-self-start"
                  />
                </Link>
              </li>
            ))}
          </ol>
        </ArtShell>
      ) : null}

      {collaborators.length ? (
        <ArtShell id="collaborations" label="Collaborations">
          <ArtHeader
            heading="Made together with"
            body="Artists who shared an exhibition or created a work with them."
          />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {collaborators.map(({ other, link }) => (
              <li key={other.id}>
                <Link
                  href={`/art-gallery/artists/${other.slug}`}
                  className="group flex items-center gap-4 rounded-(--radius) border border-line p-3 transition-colors hover:border-accent"
                >
                  <ArtistArch
                    artist={other}
                    sizes="4rem"
                    className="w-14 shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-display text-lg group-hover:text-accent">
                      {other.name}
                    </span>
                    <span className="block font-label text-xs text-muted">
                      {[
                        link.exhibitions.length
                          ? plural(link.exhibitions.length, "show")
                          : null,
                        link.works.length
                          ? plural(link.works.length, "shared work")
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </ArtShell>
      ) : null}

      {artist.images.length ? (
        <ArtShell id="studio" label="Studio and process" band>
          <ArtHeader heading="Studio and process" />
          <PhotoGrid images={artist.images} layout="mosaic" />
        </ArtShell>
      ) : null}

      {videos.length ? (
        <ArtShell id="videos" label="Videos">
          <ArtHeader heading="Videos" />
          <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2">
            {videos.map((video) => (
              <li key={video.id}>
                <VideoCard video={video} />
              </li>
            ))}
          </ul>
        </ArtShell>
      ) : null}

      {others.length ? (
        <ArtShell id="more" label="More artists" band>
          <ArtHeader
            heading="More artists"
            link={{ label: "All artists", href: "/art-gallery/artists" }}
          />
          <ul className="grid grid-cols-2 gap-x-4 gap-y-14 sm:grid-cols-4 sm:gap-x-6 lg:gap-x-8">
            {others.map((a) => (
              <li key={a.id}>
                <ArtArtistCardView
                  artist={a}
                  showDemo={settings.showDemoLabels}
                  memberCount={catalog.members[a.id]?.length}
                />
              </li>
            ))}
          </ul>
        </ArtShell>
      ) : null}
    </>
  );
}
