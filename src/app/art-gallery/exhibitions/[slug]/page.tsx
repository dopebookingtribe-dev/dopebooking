import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type CSSProperties } from "react";
import { StringArt } from "@/components/site/string-art";
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
  placeLabel,
  siteUrl,
  TimingBadge,
} from "@/modules/art/components/art-ui";
import { ArtArtistCardView } from "@/modules/art/components/artist-arch";
import { ArtworkGrid } from "@/modules/art/components/artwork-grid";
import { ExhibitionCardView } from "@/modules/art/components/exhibition-card";
import { PhotoCollections } from "@/modules/art/components/photo-collections";
import { getArtCatalog, getArtExhibitionDetail } from "@/modules/art/queries";
import {
  disciplineLabels,
  formatDateRange,
  PARTNER_KINDS,
  ROLES,
} from "@/modules/art/schemas";
import { getSiteSettings } from "@/modules/cms/queries";
import { mobileSource } from "@/modules/media/image-specs";
import { VideoCard } from "@/modules/videos/components/video-card";
import { getPublishedVideos } from "@/modules/videos/queries";

type Props = PageProps<"/art-gallery/exhibitions/[slug]">;

async function load(slug: string) {
  const catalog = await getArtCatalog();
  const exhibition = catalog.exhibitions.find((e) => e.slug === slug);
  if (!exhibition) return null;
  const detail = await getArtExhibitionDetail(slug);
  if (!detail) return null;
  return { catalog, exhibition, detail };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) return { title: "Exhibition not found" };
  const { exhibition, detail } = data;
  const description =
    detail.seoDescription ??
    exhibition.summary ??
    [
      exhibition.festival?.name,
      formatDateRange(
        exhibition.startsOn,
        exhibition.endsOn,
        exhibition.dateNote,
      ),
      placeLabel(exhibition),
    ]
      .filter(Boolean)
      .join(" · ");
  return {
    title: detail.seoTitle ?? exhibition.title,
    description,
    alternates: { canonical: `/art-gallery/exhibitions/${exhibition.slug}` },
    openGraph: {
      title: `${exhibition.title} | DopeBooking Art Gallery`,
      description,
      images: exhibition.cover
        ? [
            {
              url: exhibition.cover.url,
              width: exhibition.cover.width,
              height: exhibition.cover.height,
              alt: exhibition.cover.alt,
            },
          ]
        : undefined,
    },
  };
}

export default function ExhibitionPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div aria-hidden className="min-h-[86svh] animate-pulse bg-surface-1" />
      }
    >
      <Exhibition params={params} />
    </Suspense>
  );
}

async function Exhibition({ params }: { params: Props["params"] }) {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) notFound();
  const { catalog, exhibition, detail } = data;
  const [videos, settings] = await Promise.all([
    getPublishedVideos({ artExhibitionId: exhibition.id }),
    getSiteSettings(),
  ]);

  const artistById = new Map(catalog.artists.map((a) => [a.id, a]));
  const lineup = catalog.participations
    .filter((p) => p.exhibitionId === exhibition.id)
    .flatMap((p) => {
      const artist = artistById.get(p.artistId);
      return artist ? [{ ...p, artist }] : [];
    });
  const curators = lineup.filter((p) => p.roles.includes("curator"));
  const workById = new Map(catalog.works.map((w) => [w.id, w]));
  const works = (catalog.collections[exhibition.id] ?? []).flatMap((id) => {
    const work = workById.get(id);
    return work ? [work] : [];
  });
  const madeTogether = works.filter((w) => w.credits.length > 1);
  const disciplines = [
    ...new Set([
      ...lineup.flatMap((p) => p.artist.disciplines),
      ...works.flatMap((w) => (w.discipline ? [w.discipline] : [])),
    ]),
  ];
  const dates = formatDateRange(
    exhibition.startsOn,
    exhibition.endsOn,
    exhibition.dateNote,
  );
  const place = placeLabel(exhibition);
  const accent = exhibition.accent ?? "var(--accent)";
  const memberCounts = Object.fromEntries(
    Object.entries(catalog.members).map(([id, list]) => [id, list.length]),
  );

  const related = [
    ...catalog.exhibitions.filter(
      (e) =>
        e.id !== exhibition.id &&
        exhibition.festival &&
        e.festival?.id === exhibition.festival.id,
    ),
    ...catalog.exhibitions.filter(
      (e) =>
        e.id !== exhibition.id &&
        (!exhibition.festival || e.festival?.id !== exhibition.festival.id),
    ),
  ].slice(0, 3);

  const partnerGroups = (
    Object.keys(PARTNER_KINDS) as (keyof typeof PARTNER_KINDS)[]
  )
    .map((kind) => ({
      kind,
      items: detail.partners.filter((p) => p.kind === kind),
    }))
    .filter((group) => group.items.length);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ExhibitionEvent",
    name: exhibition.title,
    description:
      exhibition.summary ?? detail.overview?.slice(0, 300) ?? undefined,
    url: siteUrl(`/art-gallery/exhibitions/${exhibition.slug}`),
    image: exhibition.cover?.url,
    startDate: exhibition.startsOn ?? undefined,
    endDate: exhibition.endsOn ?? exhibition.startsOn ?? undefined,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location:
      exhibition.city || exhibition.venueName
        ? {
            "@type": "Place",
            name:
              exhibition.venueName ??
              exhibition.festival?.name ??
              exhibition.city,
            address: {
              "@type": "PostalAddress",
              addressLocality: exhibition.city ?? undefined,
              addressCountry: exhibition.country ?? undefined,
            },
          }
        : undefined,
    superEvent: exhibition.festival
      ? {
          "@type": "Festival",
          name: exhibition.festival.name,
          url: exhibition.festival.websiteUrl ?? undefined,
        }
      : undefined,
    organizer: {
      "@type": "Organization",
      name: "DopeBooking Art Gallery",
      url: siteUrl("/art-gallery"),
    },
    performer: lineup.map((p) => ({
      "@type": p.artist.kind === "collective" ? "PerformingGroup" : "Person",
      name: p.artist.name,
      url: siteUrl(`/art-gallery/artists/${p.artist.slug}`),
    })),
  };

  return (
    <div style={{ "--thread": accent } as CSSProperties}>
      <JsonLd data={jsonLd} />

      {/* Header: the exhibition's cover, full screen */}
      <section className="relative isolate flex min-h-[86svh] items-end overflow-hidden border-b border-line">
        {exhibition.cover ? (
          <Picture
            image={exhibition.cover}
            mobile={mobileSource(exhibition.mobileCover, "belowSm")}
            priority
            sizes="100vw"
            className="-z-20"
          />
        ) : (
          <StringArt className="pointer-events-none absolute top-1/2 -right-40 -z-20 w-[52rem] max-w-none -translate-y-1/2 opacity-60" />
        )}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-linear-to-t from-bg via-bg/70 to-bg/10 sm:bg-linear-to-tr sm:from-bg sm:via-bg/60 sm:to-transparent"
        />
        <Container className="pt-28 pb-12 sm:pb-16">
          <Link
            href="/art-gallery/exhibitions"
            className="text-sm text-text/80 hover:text-text"
          >
            ← All exhibitions
          </Link>
          <div className="mt-8 flex gap-5 sm:gap-7">
            <span
              aria-hidden
              className="w-1 shrink-0 rounded-full bg-(--thread)"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <TimingBadge timing={exhibition.timing} />
                {exhibition.isDemo && settings.showDemoLabels ? (
                  <DemoBadge />
                ) : null}
              </div>
              {exhibition.festival ? (
                <p className="mt-5 font-label text-text/85">
                  {exhibition.festival.name}
                </p>
              ) : null}
              <TiltHeading className="mt-2 max-w-5xl text-[clamp(2.75rem,1rem+6.5vw,7.5rem)] leading-[0.92] text-balance">
                {exhibition.title}
              </TiltHeading>
              {exhibition.subtitle ? (
                <p className="mt-4 max-w-3xl font-serif-art text-2xl text-text/90 italic sm:text-3xl">
                  {exhibition.subtitle}
                </p>
              ) : null}
              <p className="mt-6 font-label text-text/85">
                {[dates, place].filter(Boolean).join(" · ")}
              </p>
              {curators.length ? (
                <p className="mt-1 text-text/80">
                  Curated by {curators.map((c) => c.artist.name).join(" & ")}
                </p>
              ) : null}
            </div>
          </div>
          {exhibition.cover?.credit ? (
            <p className="mt-10 text-right font-label text-xs text-text/60">
              Photo: {exhibition.cover.credit}
            </p>
          ) : null}
        </Container>
      </section>

      {/* Overview, concept and facts */}
      <Container className="grid gap-14 py-16 sm:py-24 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:gap-20">
        <div>
          {exhibition.summary ? (
            <p className="max-w-[40ch] font-display text-3xl leading-tight text-balance sm:text-4xl">
              {exhibition.summary}
            </p>
          ) : null}
          {detail.overview ? (
            <section
              aria-labelledby="overview-heading"
              className={exhibition.summary ? "mt-12" : ""}
            >
              <h2
                id="overview-heading"
                className="font-label text-sm text-accent"
              >
                About the exhibition
              </h2>
              <div className="mt-5 flex max-w-[64ch] flex-col gap-5 text-lg leading-relaxed text-text/90">
                <ArtParagraphs text={detail.overview} />
              </div>
            </section>
          ) : null}
          {detail.concept ? (
            <section aria-labelledby="concept-heading" className="mt-14">
              <h2
                id="concept-heading"
                className="font-label text-sm text-accent"
              >
                Artistic concept
              </h2>
              <blockquote className="mt-5 border-l border-(--thread) pl-6 sm:pl-8">
                <div className="flex max-w-[56ch] flex-col gap-4 font-serif-art text-2xl leading-snug text-text/95 italic sm:text-[1.75rem]">
                  <ArtParagraphs text={detail.concept} />
                </div>
              </blockquote>
            </section>
          ) : null}
          {!exhibition.summary && !detail.overview && !detail.concept ? (
            <p className="text-lg text-muted">
              More about this exhibition soon.
            </p>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <dl className="rounded-(--radius) border border-line bg-surface-1 p-6 sm:p-8">
            {[
              ["Festival", exhibition.festival?.name],
              ["Dates", dates],
              ["Place", place],
              ["Artists", lineup.length ? String(lineup.length) : null],
              ["Works", works.length ? String(works.length) : null],
            ]
              .filter((row): row is [string, string] => !!row[1])
              .map(([term, value]) => (
                <div
                  key={term}
                  className="flex justify-between gap-6 border-b border-line py-3 first:pt-0"
                >
                  <dt className="text-muted">{term}</dt>
                  <dd className="text-right">{value}</dd>
                </div>
              ))}
            {disciplines.length ? (
              <div className="py-4">
                <dt className="text-muted">Disciplines</dt>
                <dd className="mt-3 flex flex-wrap gap-2">
                  {disciplineLabels(disciplines).map((label) => (
                    <span
                      key={label}
                      className="rounded-full border border-line-strong px-3 py-1 font-label text-xs"
                    >
                      {label}
                    </span>
                  ))}
                </dd>
              </div>
            ) : null}
            <div className="mt-4 flex flex-col gap-3">
              {detail.event ? (
                <ButtonLink
                  href={`/events/${detail.event.slug}`}
                  variant="secondary"
                  className="w-full"
                >
                  Line-up &amp; tickets
                </ButtonLink>
              ) : null}
              {detail.externalUrl ? (
                <a
                  href={detail.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 text-sm underline decoration-line-strong underline-offset-[6px] hover:text-uv"
                >
                  Festival website <span aria-hidden>↗</span>
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : exhibition.festival?.websiteUrl ? (
                <a
                  href={exhibition.festival.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 text-sm underline decoration-line-strong underline-offset-[6px] hover:text-uv"
                >
                  {exhibition.festival.name} website <span aria-hidden>↗</span>
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : null}
            </div>
          </dl>
        </aside>
      </Container>

      {lineup.length ? (
        <ArtShell id="artists" label="Participating artists" band>
          <ArtHeader
            heading="The artists"
            body={
              lineup.length > 1
                ? `${lineup.length} artists made this exhibition together.`
                : undefined
            }
          />
          <ul className="grid grid-cols-2 gap-x-4 gap-y-14 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8">
            {lineup.map((p) => (
              <li key={p.artistId} className="art-reveal">
                <ArtArtistCardView
                  artist={p.artist}
                  roles={p.roles}
                  note={p.note}
                  memberCount={memberCounts[p.artist.id]}
                  showDemo={settings.showDemoLabels}
                />
              </li>
            ))}
          </ul>
          <p className="mt-14 max-w-[70ch] text-sm text-muted">
            Roles in this exhibition:{" "}
            {[...new Set(lineup.flatMap((p) => p.roles))]
              .map((r) => ROLES[r].label)
              .join(", ")}
            .
          </p>
        </ArtShell>
      ) : null}

      {works.length ? (
        <ArtShell id="collection" label="The collection">
          <ArtHeader
            heading="The collection"
            body="Every work shown, at its own shape. Select one to see it full screen with its label."
          />
          <ArtworkGrid works={works} showDemo={settings.showDemoLabels} />
        </ArtShell>
      ) : null}

      {madeTogether.length ? (
        <ArtShell id="made-together" label="Made together" band>
          <ArtHeader
            heading="Made together"
            body="Collaborative works and special projects created by several artists for this exhibition."
          />
          <ul className="grid gap-10 md:grid-cols-2">
            {madeTogether.map((work) => (
              <li
                key={work.id}
                className="grid grid-cols-[7rem_minmax(0,1fr)] gap-5 sm:grid-cols-[10rem_minmax(0,1fr)]"
              >
                <Link
                  href={`/art-gallery/works/${work.slug}`}
                  className="relative block self-start overflow-hidden bg-surface-2"
                  style={{
                    aspectRatio: work.image
                      ? `${work.image.width} / ${work.image.height}`
                      : "1",
                  }}
                >
                  {work.image ? (
                    <Image
                      src={work.image.url}
                      alt={work.image.alt}
                      fill
                      sizes="10rem"
                      className="object-contain"
                    />
                  ) : null}
                </Link>
                <div>
                  <Link
                    href={`/art-gallery/works/${work.slug}`}
                    className="font-serif-art text-2xl italic hover:text-accent"
                  >
                    {work.title}
                  </Link>
                  <p className="mt-2 text-sm">
                    {work.credits.map((c, i) => (
                      <span key={c.artist.id}>
                        {i ? " × " : ""}
                        <Link
                          href={`/art-gallery/artists/${c.artist.slug}`}
                          className="underline decoration-line-strong underline-offset-4 hover:text-accent"
                        >
                          {c.artist.name}
                        </Link>
                        {c.credit ? (
                          <span className="text-muted"> ({c.credit})</span>
                        ) : null}
                      </span>
                    ))}
                  </p>
                  {work.description ? (
                    <p className="mt-3 line-clamp-4 text-sm text-muted">
                      {work.description}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </ArtShell>
      ) : null}

      {detail.photos.length ? (
        <ArtShell id="photos" label="Exhibition photography">
          <ArtHeader
            heading="In the space"
            body="The exhibition as it was lived: installations, close-ups, festival moments and the work behind them."
          />
          <PhotoCollections photos={detail.photos} />
        </ArtShell>
      ) : null}

      {videos.length ? (
        <ArtShell id="videos" label="Videos" band>
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

      {partnerGroups.length ? (
        <ArtShell id="partners" label="Partners">
          <ArtHeader heading="With thanks to" />
          <div className="flex flex-col gap-10">
            {partnerGroups.map((group) => (
              <div
                key={group.kind}
                className="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-center"
              >
                <h3 className="font-label text-sm text-muted">
                  {PARTNER_KINDS[group.kind]}
                </h3>
                <ul className="flex flex-wrap items-center gap-x-10 gap-y-6">
                  {group.items.map((partner) => {
                    const body = partner.logo ? (
                      <Image
                        src={partner.logo.url}
                        alt={partner.name}
                        width={partner.logo.width}
                        height={partner.logo.height}
                        sizes="10rem"
                        className="h-auto max-h-14 w-auto max-w-40 object-contain opacity-85 transition-opacity hover:opacity-100"
                      />
                    ) : (
                      <span className="font-display text-xl">
                        {partner.name}
                      </span>
                    );
                    return (
                      <li key={partner.id}>
                        {partner.url ? (
                          <a
                            href={partner.url}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="inline-flex min-h-11 items-center hover:text-accent"
                          >
                            {body}
                            <span className="sr-only">
                              (opens in a new tab)
                            </span>
                          </a>
                        ) : (
                          body
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </ArtShell>
      ) : null}

      {related.length ? (
        <ArtShell id="more" label="More exhibitions" band>
          <ArtHeader
            heading="More exhibitions"
            link={{
              label: "All exhibitions",
              href: "/art-gallery/exhibitions",
            }}
          />
          <ul className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((e) => (
              <li key={e.id}>
                <ExhibitionCardView
                  exhibition={e}
                  artists={artistById}
                  showDemo={settings.showDemoLabels}
                />
              </li>
            ))}
          </ul>
        </ArtShell>
      ) : null}

      <section className="border-t border-line py-20 sm:py-28">
        <Container className="flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-display text-headline text-balance">
              Want a gallery like this at your festival?
            </h2>
            <p className="mt-4 max-w-[52ch] text-lg text-muted">
              Tell us about your event and the space you have. We reply with a
              concept, artists and a quote.
            </p>
          </div>
          <ButtonLink href="/art-gallery/collaborate" size="lg">
            Collaborate with us
          </ButtonLink>
        </Container>
      </section>
    </div>
  );
}
