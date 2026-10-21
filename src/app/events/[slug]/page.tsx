import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StringArt } from "@/components/site/string-art";
import { ButtonLink } from "@/components/ui/button";
import { DemoBadge } from "@/components/ui/demo-badge";
import { Picture } from "@/components/ui/picture";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { countryName } from "@/lib/countries";
import {
  formatEventDate,
  formatEventRange,
  formatEventTime,
} from "@/lib/datetime";
import { getSiteSettings } from "@/modules/cms/queries";
import { eventPlace } from "@/modules/events/components/event-row";
import { getPublishedEvent } from "@/modules/events/queries";
import { GalleryCard } from "@/modules/galleries/components/gallery-card";
import { getPublishedGalleries } from "@/modules/galleries/queries";
import { VideoCard } from "@/modules/videos/components/video-card";
import { getPublishedVideos } from "@/modules/videos/queries";

type Props = PageProps<"/events/[slug]">;
const siteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublishedEvent(slug);
  if (!event) return { title: "Event not found" };
  const description =
    event.seoDescription ??
    event.summary ??
    `${formatEventRange(event.startsAt, event.endsAt, event.timezone)}, ${eventPlace(event)}`;
  return {
    title: event.seoTitle ?? event.title,
    description,
    alternates: { canonical: `/events/${event.slug}` },
    openGraph: {
      title: `${event.title} | DopeBooking`,
      description,
      images: event.cover
        ? [{ url: event.cover.url, alt: event.cover.alt }]
        : undefined,
    },
  };
}

export default function EventPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <Container className="py-24">
          <p className="text-muted">Loading event…</p>
        </Container>
      }
    >
      <EventDetail params={params} />
    </Suspense>
  );
}

async function EventDetail({ params }: { params: Props["params"] }) {
  const { slug } = await params;
  const event = await getPublishedEvent(slug);
  if (!event) notFound();

  const [galleries, videos, settings] = await Promise.all([
    getPublishedGalleries({ eventId: event.id }),
    getPublishedVideos({ eventId: event.id }),
    getSiteSettings(),
  ]);
  const paragraphs = (event.description ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    name: event.title,
    startDate: event.startsAt,
    endDate: event.endsAt ?? undefined,
    eventStatus: "https://schema.org/EventScheduled",
    url: new URL(`/events/${event.slug}`, siteUrl()).toString(),
    image: event.cover?.url,
    description: event.summary ?? undefined,
    location: {
      "@type": "Place",
      name: event.venueName ?? event.city ?? undefined,
      address: {
        "@type": "PostalAddress",
        addressLocality: event.city ?? undefined,
        addressCountry: event.country ?? undefined,
      },
    },
    performer: event.lineup.map((act) => ({
      "@type": "MusicGroup",
      name: act.stageName,
      url: new URL(`/artists/${act.slug}`, siteUrl()).toString(),
    })),
    offers: event.ticketUrl
      ? { "@type": "Offer", url: event.ticketUrl }
      : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <section className="relative isolate overflow-hidden border-b border-line">
        {event.cover ? (
          <>
            <Picture
              image={event.cover}
              priority
              sizes="100vw"
              className="-z-20"
            />
            <div
              aria-hidden
              className="absolute inset-0 -z-10 bg-linear-to-t from-bg via-bg/60 to-bg/10"
            />
          </>
        ) : (
          <StringArt className="pointer-events-none absolute top-1/2 -right-40 -z-20 w-[48rem] max-w-none -translate-y-1/2 opacity-50" />
        )}
        <Container className="flex min-h-[78svh] flex-col justify-end pt-32 pb-14">
          <Link
            href="/events"
            className="text-sm text-muted transition-colors hover:text-text"
          >
            ← All events
          </Link>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Meta className="text-text/85">
              {formatEventRange(event.startsAt, event.endsAt, event.timezone)}
              {event.city ? `, ${event.city}` : ""}
              {event.country ? `, ${countryName(event.country)}` : ""}
            </Meta>
            {event.isDemo && settings.showDemoLabels ? <DemoBadge /> : null}
            {event.isPast ? (
              <span className="rounded-full border border-line-strong px-2.5 py-0.5 font-label text-xs text-muted">
                Past event
              </span>
            ) : null}
          </div>
          <h1 className="mt-4 max-w-5xl font-display text-[clamp(2.6rem,1rem+7vw,7.5rem)] leading-[0.92] text-balance">
            {event.title}
          </h1>
          {event.summary ? (
            <p className="mt-6 max-w-2xl text-xl text-muted">{event.summary}</p>
          ) : null}
          {event.ticketUrl && !event.isPast ? (
            <div className="mt-10">
              <ButtonLink
                href={event.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                size="lg"
              >
                Get tickets{" "}
                <span className="sr-only">(opens in a new tab)</span>
              </ButtonLink>
            </div>
          ) : null}
        </Container>
      </section>

      <Container className="grid gap-16 py-16 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-16">
          {paragraphs.length ? (
            <div className="flex max-w-prose flex-col gap-5 text-lg leading-relaxed">
              {paragraphs.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          ) : null}

          {event.lineup.length ? (
            <section aria-labelledby="lineup-heading">
              <h2 id="lineup-heading" className="font-display text-headline">
                Lineup
              </h2>
              <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                {event.lineup.map((act) => (
                  <li key={act.slug}>
                    <Link
                      href={`/artists/${act.slug}`}
                      className="group relative block overflow-hidden rounded-(--radius) bg-surface-2"
                    >
                      <div className="relative aspect-[4/5]">
                        {act.portrait ? (
                          <Picture
                            image={act.portrait}
                            decorative
                            sizes="(min-width: 1024px) 20vw, 45vw"
                            className="transition-transform duration-700 ease-(--ease-out) group-hover:scale-[1.04]"
                          />
                        ) : null}
                        <div
                          aria-hidden
                          className="absolute inset-0 bg-linear-to-t from-bg via-bg/20 to-transparent"
                        />
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-4">
                        <p className="font-display text-xl leading-tight transition-colors group-hover:text-accent sm:text-2xl">
                          {act.stageName}
                        </p>
                        {act.stage || act.setStartsAt ? (
                          <p className="mt-1 font-label text-sm text-text/80">
                            {[
                              act.stage,
                              act.setStartsAt
                                ? `${formatEventDate(act.setStartsAt, event.timezone).slice(0, 3)} ${formatEventTime(act.setStartsAt, event.timezone)}`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside
          aria-label="Event information"
          className="lg:sticky lg:top-24 lg:self-start"
        >
          <dl className="divide-y divide-line rounded-(--radius) border border-line bg-surface-1 px-6">
            <div className="py-4">
              <dt>
                <Meta>When</Meta>
              </dt>
              <dd className="mt-1">
                {formatEventRange(event.startsAt, event.endsAt, event.timezone)}
                <span className="block text-sm text-muted">
                  From {formatEventTime(event.startsAt, event.timezone)} (
                  {event.timezone.replaceAll("_", " ")})
                </span>
              </dd>
            </div>
            {eventPlace(event) ? (
              <div className="py-4">
                <dt>
                  <Meta>Where</Meta>
                </dt>
                <dd className="mt-1">{eventPlace(event)}</dd>
              </div>
            ) : null}
          </dl>
          <div className="mt-6 flex flex-col gap-3">
            {event.ticketUrl && !event.isPast ? (
              <ButtonLink
                href={event.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Get tickets{" "}
                <span className="sr-only">(opens in a new tab)</span>
              </ButtonLink>
            ) : null}
            {event.lineup.length ? (
              <ButtonLink href="/artists" variant="secondary">
                Book artists from this lineup
              </ButtonLink>
            ) : null}
          </div>
        </aside>
      </Container>

      {galleries.length || videos.length ? (
        <Container className="pb-24">
          <h2 className="font-display text-headline">Photos &amp; videos</h2>
          <ul className="mt-8 grid gap-x-6 gap-y-12 sm:grid-cols-2">
            {videos.map((video) => (
              <li key={video.id}>
                <VideoCard video={video} />
              </li>
            ))}
            {galleries.map((gallery) => (
              <li key={gallery.id}>
                <GalleryCard gallery={gallery} />
              </li>
            ))}
          </ul>
        </Container>
      ) : null}
    </>
  );
}
