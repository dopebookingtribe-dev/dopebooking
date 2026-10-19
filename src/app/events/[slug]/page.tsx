import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { countryName } from "@/lib/countries";
import {
  formatEventDate,
  formatEventRange,
  formatEventTime,
} from "@/lib/datetime";
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
    event.summary ??
    `${formatEventRange(event.startsAt, event.endsAt, event.timezone)} · ${eventPlace(event)}`;
  return {
    title: event.title,
    description,
    alternates: { canonical: `/events/${event.slug}` },
    openGraph: {
      title: `${event.title} · DopeBooking`,
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

  const [galleries, videos] = await Promise.all([
    getPublishedGalleries({ eventId: event.id }),
    getPublishedVideos({ eventId: event.id }),
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
            <Image
              src={event.cover.url}
              alt={event.cover.alt}
              fill
              priority
              sizes="100vw"
              className="-z-20 object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-0 -z-10 bg-linear-to-t from-bg via-bg/70 to-bg/20"
            />
          </>
        ) : null}
        <Container className="flex min-h-[60svh] flex-col justify-end pt-24 pb-12">
          <Link
            href="/events"
            className="text-sm text-muted transition-colors hover:text-text"
          >
            ← All events
          </Link>
          <Meta className="mt-8">
            {formatEventRange(event.startsAt, event.endsAt, event.timezone)}
            {event.city ? ` · ${event.city}` : ""}
            {event.country ? `, ${countryName(event.country)}` : ""}
          </Meta>
          <h1 className="mt-4 max-w-5xl font-display text-display">
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
              <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
                {event.lineup.map((act) => (
                  <li key={act.slug}>
                    <Link href={`/artists/${act.slug}`} className="group block">
                      <div className="relative aspect-[4/5] overflow-hidden rounded-(--radius) bg-surface-2">
                        {act.portrait ? (
                          <Image
                            src={act.portrait.url}
                            alt=""
                            fill
                            sizes="(min-width: 1024px) 20vw, 45vw"
                            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                          />
                        ) : null}
                      </div>
                      <p className="mt-3 font-display text-2xl transition-colors group-hover:text-accent">
                        {act.stageName}
                      </p>
                      {act.stage || act.setStartsAt ? (
                        <p className="mt-1 font-mono text-[0.7rem] tracking-[0.12em] text-muted uppercase">
                          {[
                            act.stage,
                            act.setStartsAt
                              ? `${formatEventDate(act.setStartsAt, event.timezone).slice(0, 3)} ${formatEventTime(act.setStartsAt, event.timezone)}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      ) : null}
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
          <dl className="divide-y divide-line border-y border-line">
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
