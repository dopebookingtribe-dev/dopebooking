import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { countryName } from "@/lib/countries";
import { formatEventRange } from "@/lib/datetime";
import { Kaleidoscope } from "@/components/site/kaleidoscope";
import { StringArt } from "@/components/site/string-art";
import { TiltHeading } from "@/components/site/tilt-heading";
import { DemoBadge } from "@/components/ui/demo-badge";
import {
  ArtistCard,
  ArtistLens,
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

      <section className="relative isolate overflow-hidden border-b border-line">
        {hero ? (
          <Kaleidoscope
            src={hero.url}
            centerX={0.78}
            centerY={0.5}
            segments={12}
            open
            className="absolute inset-0 -z-20 size-full"
          />
        ) : (
          <StringArt className="pointer-events-none absolute top-1/2 -right-40 -z-20 w-[48rem] max-w-none -translate-y-1/2 opacity-60" />
        )}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 hidden sm:block"
          style={{
            background:
              "linear-gradient(90deg, var(--bg) 20%, color-mix(in oklab, var(--bg) 70%, transparent) 50%, color-mix(in oklab, var(--bg) 25%, transparent) 100%), linear-gradient(0deg, var(--bg) 2%, transparent 35%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-linear-to-t from-bg from-40% via-bg/75 to-bg/30 sm:hidden"
        />
        <Container className="grid min-h-[78svh] items-center gap-14 pt-16 pb-16 sm:pb-20 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <div>
            <Link
              href="/artists"
              className="text-sm text-text/80 transition-colors hover:text-text"
            >
              ← All artists
            </Link>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {meta.length ? (
                <Meta className="text-text/85">{meta.join(", ")}</Meta>
              ) : null}
              {artist.isDemo && settings.showDemoLabels ? <DemoBadge /> : null}
            </div>
            <TiltHeading className="mt-4 text-[clamp(3rem,1rem+8vw,8.5rem)] leading-[0.9] text-balance">
              {artist.stageName}
            </TiltHeading>
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
          </div>
          <figure className="mx-auto w-full max-w-[26rem]">
            <div className="rounded-full outline-2 outline-offset-[14px] outline-accent/70">
              <ArtistLens
                artist={artist}
                priority
                sizes="(min-width: 1024px) 26rem, 80vw"
              />
            </div>
            {artist.portrait?.credit ? (
              <figcaption className="mt-10 text-center font-label text-sm text-muted">
                Photo: {artist.portrait.credit}
              </figcaption>
            ) : null}
          </figure>
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
            <ul className="mt-14 grid gap-x-10 gap-y-16 sm:grid-cols-3">
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
