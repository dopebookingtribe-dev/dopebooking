import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { countryName } from "@/lib/countries";
import { formatEventRange } from "@/lib/datetime";
import { StringArt } from "@/components/site/string-art";
import { DemoBadge } from "@/components/ui/demo-badge";
import { Picture } from "@/components/ui/picture";
import {
  ArtistCard,
  genreLabels,
} from "@/modules/artists/components/artist-card";
import { getSiteSettings } from "@/modules/cms/queries";
import { PhotoGrid } from "@/modules/galleries/components/photo-grid";
import { eventPlace } from "@/modules/events/components/event-row";
import { getUpcomingEventsForArtist } from "@/modules/events/queries";
import { VideoCard } from "@/modules/videos/components/video-card";
import { getPublishedVideos } from "@/modules/videos/queries";
import {
  getPublishedArtist,
  getPublishedArtists,
} from "@/modules/artists/queries";
import { LINK_PLATFORMS } from "@/modules/artists/schemas";

type Props = PageProps<"/artists/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getPublishedArtist(slug);
  if (!artist) return { title: "Artist not found" };

  const description =
    artist.seoDescription ??
    artist.tagline ??
    artist.bio?.slice(0, 155) ??
    `Book ${artist.stageName} through DopeBooking.`;
  return {
    title: artist.seoTitle ?? artist.stageName,
    description,
    alternates: { canonical: `/artists/${artist.slug}` },
    openGraph: {
      title: `${artist.stageName} | DopeBooking`,
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

export default function ArtistPage({ params }: Props) {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <Profile params={params} />
    </Suspense>
  );
}

async function Profile({ params }: { params: Props["params"] }) {
  const { slug } = await params;
  const artist = await getPublishedArtist(slug);
  if (!artist) notFound();

  const meta = [
    [artist.basedIn, countryName(artist.country)].filter(Boolean).join(", "),
    ...genreLabels(artist.genres),
  ].filter(Boolean);
  const [shows, videos, settings] = await Promise.all([
    getUpcomingEventsForArtist(artist.id),
    getPublishedVideos({ artistId: artist.id }),
    getSiteSettings(),
  ]);
  const gallery = artist.images.filter(
    (image) =>
      image.id !== artist.portrait?.id && image.id !== artist.cover?.id,
  );
  const paragraphs = (artist.bio ?? "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: artist.stageName,
    url: new URL(
      `/artists/${artist.slug}`,
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    ).toString(),
    genre: genreLabels(artist.genres),
    image: artist.portrait?.url,
    description: artist.tagline ?? undefined,
    sameAs: artist.links.map((link) => link.url),
  };

  const hero = artist.cover ?? artist.portrait;
  const others = (await getPublishedArtists())
    .filter((other) => other.id !== artist.id)
    .slice(0, 3);

  return (
    <>
      <script
        type="application/ld+json"
        // Escape "<" so profile text can't close the script tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <section className="relative isolate flex min-h-[78svh] items-end overflow-hidden border-b border-line">
        {hero ? (
          <Picture image={hero} priority sizes="100vw" className="-z-20" />
        ) : (
          <StringArt className="pointer-events-none absolute top-1/2 -right-40 -z-20 w-[48rem] max-w-none -translate-y-1/2 opacity-60" />
        )}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-linear-to-t from-bg via-bg/50 to-bg/10"
        />
        <Container className="pt-40 pb-12 sm:pb-16">
          <Link
            href="/artists"
            className="text-sm text-text/80 transition-colors hover:text-text"
          >
            ← All artists
          </Link>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {meta.length ? (
              <Meta className="text-text/85">{meta.join(", ")}</Meta>
            ) : null}
            {artist.isDemo && settings.showDemoLabels ? <DemoBadge /> : null}
          </div>
          <h1 className="mt-4 font-display text-[clamp(3rem,1rem+9vw,9rem)] leading-[0.9] text-balance">
            {artist.stageName}
          </h1>
          {artist.tagline ? (
            <p className="mt-6 max-w-2xl text-xl text-text/85">
              {artist.tagline}
            </p>
          ) : null}
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href={`/book/${artist.slug}`} size="lg">
              Request booking
            </ButtonLink>
            {artist.links.length ? (
              <ButtonLink href="#listen" variant="secondary" size="lg">
                Listen
              </ButtonLink>
            ) : null}
          </div>
          {hero?.credit ? (
            <p className="mt-10 font-label text-sm text-muted">
              Photo: {hero.credit}
            </p>
          ) : null}
        </Container>
      </section>

      <Container className="grid gap-14 py-16 sm:py-24 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:gap-20">
        <div>
          {paragraphs.length ? (
            <section aria-labelledby="bio-heading">
              <h2 id="bio-heading" className="font-display text-headline">
                About
              </h2>
              <div className="mt-8 flex max-w-[64ch] flex-col gap-5 text-lg leading-relaxed text-text/90">
                {paragraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </section>
          ) : null}

          {shows.length ? (
            <section aria-labelledby="shows-heading" className="mt-16">
              <h2 id="shows-heading" className="font-display text-2xl">
                Upcoming shows
              </h2>
              <ul className="mt-6 divide-y divide-line border-y border-line">
                {shows.map((show) => (
                  <li key={show.id}>
                    <Link
                      href={`/events/${show.slug}`}
                      className="group flex min-h-16 flex-col justify-center gap-1 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="font-display text-xl transition-colors group-hover:text-accent">
                        {show.title}
                      </span>
                      <span className="font-label text-muted">
                        {formatEventRange(
                          show.startsAt,
                          show.endsAt,
                          show.timezone,
                        )}
                        {eventPlace(show) ? `, ${eventPlace(show)}` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {artist.links.length ? (
            <section
              id="listen"
              aria-labelledby="links-heading"
              className="mt-16 scroll-mt-24"
            >
              <h2 id="links-heading" className="font-display text-2xl">
                Listen and follow
              </h2>
              <ul className="mt-6 flex flex-wrap gap-2">
                {artist.links.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-5 text-sm transition-colors hover:border-accent hover:text-accent"
                    >
                      {LINK_PLATFORMS[link.platform]}
                      <span aria-hidden className="text-muted">
                        ↗
                      </span>
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          {artist.portrait &&
          artist.cover &&
          artist.portrait.id !== artist.cover.id ? (
            <div className="relative mb-8 aspect-[4/5] overflow-hidden rounded-(--radius) bg-surface-2">
              <Picture
                image={artist.portrait}
                sizes="(min-width: 1024px) 30vw, 92vw"
              />
            </div>
          ) : null}
          <div className="rounded-(--radius) border border-line bg-surface-1 p-6 sm:p-8">
            <h2 className="font-display text-2xl">Book {artist.stageName}</h2>
            {artist.bookingInfo ? (
              <div className="mt-5 flex flex-col gap-3 text-muted">
                {artist.bookingInfo
                  .split(/\n\s*\n|\n/)
                  .filter((line) => line.trim())
                  .map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}
              </div>
            ) : (
              <p className="mt-5 text-muted">
                Send your date, city and stage. We check availability and reply
                with a quote.
              </p>
            )}
            <ButtonLink href={`/book/${artist.slug}`} className="mt-8 w-full">
              Request booking
            </ButtonLink>
          </div>
        </aside>
      </Container>

      {gallery.length ? (
        <section aria-labelledby="gallery-heading" className="pb-20 sm:pb-28">
          <Container>
            <h2 id="gallery-heading" className="font-display text-headline">
              Photos
            </h2>
            <div className="mt-10">
              <PhotoGrid images={gallery} layout="mosaic" />
            </div>
          </Container>
        </section>
      ) : null}

      {videos.length ? (
        <section
          aria-labelledby="videos-heading"
          className="bg-surface-1 py-20 sm:py-28"
        >
          <Container>
            <h2 id="videos-heading" className="font-display text-headline">
              Videos
            </h2>
            <ul className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2">
              {videos.map((video) => (
                <li key={video.id}>
                  <VideoCard video={video} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

      {others.length ? (
        <section aria-labelledby="more-heading" className="py-20 sm:py-28">
          <Container>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="more-heading" className="font-display text-headline">
                More from the roster
              </h2>
              <ButtonLink href="/artists" variant="text">
                All artists
              </ButtonLink>
            </div>
            <ul className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-6">
              {others.map((other) => (
                <li key={other.id}>
                  <ArtistCard
                    artist={other}
                    headingLevel={3}
                    showDemo={settings.showDemoLabels}
                  />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}
    </>
  );
}

function ProfileSkeleton() {
  return (
    <Container
      aria-hidden
      className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16"
    >
      <div className="aspect-[4/5] animate-pulse rounded-(--radius) bg-surface-1" />
      <div className="flex flex-col gap-4 pt-16">
        <div className="h-4 w-40 rounded bg-surface-1" />
        <div className="h-20 w-3/4 rounded bg-surface-1" />
      </div>
    </Container>
  );
}
