import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { StringArt } from "@/components/site/string-art";
import { ArtistCard } from "@/modules/artists/components/artist-card";
import { getPublishedArtists } from "@/modules/artists/queries";
import { EventRow } from "@/modules/events/components/event-row";
import { getPublishedEvents } from "@/modules/events/queries";
import { ProductCard } from "@/modules/marketplace/components/product-card";
import { getShopProducts } from "@/modules/marketplace/queries";
import { OFFERS, type Offer } from "@/modules/services/schemas";
import { VideoCard } from "@/modules/videos/components/video-card";
import { getPublishedVideos } from "@/modules/videos/queries";

// The booking workflow really is a sequence, so it is numbered.
const BOOKING_STEPS = [
  {
    title: "Send a request",
    body: "Pick an artist and tell us the date, city, stage and budget.",
  },
  {
    title: "Get a quote",
    body: "We check availability with the artist and reply with a fee and terms.",
  },
  {
    title: "Confirm the booking",
    body: "Accept the quote in your dashboard and we confirm the date with the artist.",
  },
] as const;

const SERVICE_LINKS = (Object.keys(OFFERS) as Offer[]).map((offer) => ({
  href: `/services/${offer}`,
  title: OFFERS[offer].title,
  body: OFFERS[offer].pitch,
}));

export default function HomePage() {
  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-line">
        <StringArt className="pointer-events-none absolute top-0 -right-[30%] -z-10 w-[92%] max-w-none -translate-y-[16%] opacity-90 sm:top-1/2 sm:-right-[40%] sm:w-[85%] sm:-translate-y-1/2 sm:opacity-50 lg:-right-[6%] lg:w-[56%] lg:opacity-100" />
        <Container className="flex min-h-[82svh] flex-col justify-end pt-40 pb-16 sm:justify-center sm:py-28">
          <h1 className="max-w-[11ch] font-display text-display text-balance">
            Book psytrance artists for your festival.
          </h1>
          <p className="mt-8 max-w-[34rem] text-lg text-muted">
            DopeBooking represents international acts from Goa and progressive
            to forest and hi-tech, and runs promotion, catering and aftermovie
            production for open airs and club nights.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/artists">Book an artist</ButtonLink>
            <ButtonLink href="/services" variant="secondary">
              Festival services
            </ButtonLink>
          </div>
        </Container>
      </section>

      <Suspense fallback={null}>
        <FeaturedArtists />
      </Suspense>

      <section
        aria-labelledby="steps-heading"
        className="border-b border-line py-20 sm:py-24"
      >
        <Container>
          <h2 id="steps-heading" className="font-display text-headline">
            How booking works
          </h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {BOOKING_STEPS.map((step, i) => (
              <li key={step.title} className="border-t-2 border-accent pt-6">
                <p className="font-label text-5xl text-accent">{i + 1}</p>
                <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 max-w-[32ch] text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <Suspense fallback={null}>
        <UpcomingEvents />
      </Suspense>

      <section
        aria-labelledby="services-heading"
        className="border-b border-line py-20 sm:py-24"
      >
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="services-heading" className="font-display text-headline">
              Festival services
            </h2>
            <Link
              href="/services"
              className="inline-flex min-h-11 items-center text-sm underline underline-offset-4 hover:text-accent"
            >
              All services
            </Link>
          </div>
          <ul className="mt-10 border-t border-line">
            {SERVICE_LINKS.map((service) => (
              <li key={service.href}>
                <Link
                  href={service.href}
                  className="group grid gap-2 border-b border-line py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-10"
                >
                  <h3 className="font-display text-3xl transition-colors group-hover:text-accent sm:text-4xl">
                    {service.title}
                  </h3>
                  <p className="max-w-[60ch] text-muted">{service.body}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <Suspense fallback={null}>
        <LatestVideos />
      </Suspense>
      <Suspense fallback={null}>
        <FromTheShop />
      </Suspense>
    </>
  );
}

function HomeSection({
  id,
  title,
  link,
  children,
}: {
  id: string;
  title: string;
  link: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="border-b border-line py-20 sm:py-24"
    >
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id={id} className="font-display text-headline">
            {title}
          </h2>
          <Link
            href={link.href}
            className="inline-flex min-h-11 items-center text-sm underline underline-offset-4 hover:text-accent"
          >
            {link.label}
          </Link>
        </div>
        <div className="mt-10">{children}</div>
      </Container>
    </section>
  );
}

async function FeaturedArtists() {
  const artists = (await getPublishedArtists()).slice(0, 4);
  if (!artists.length) return null;
  return (
    <HomeSection
      id="artists-heading"
      title="Artists on the roster"
      link={{ href: "/artists", label: "All artists" }}
    >
      <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
        {artists.map((artist) => (
          <li key={artist.id}>
            <ArtistCard artist={artist} />
          </li>
        ))}
      </ul>
    </HomeSection>
  );
}

async function UpcomingEvents() {
  const { upcoming } = await getPublishedEvents();
  if (!upcoming.length) return null;
  return (
    <HomeSection
      id="events-heading"
      title="Upcoming events"
      link={{ href: "/events", label: "All events" }}
    >
      <ul className="border-t border-line">
        {upcoming.slice(0, 3).map((event) => (
          <li key={event.id}>
            <EventRow event={event} />
          </li>
        ))}
      </ul>
    </HomeSection>
  );
}

async function LatestVideos() {
  const videos = (await getPublishedVideos()).slice(0, 2);
  if (!videos.length) return null;
  return (
    <HomeSection
      id="videos-heading"
      title="Aftermovies and sets"
      link={{ href: "/videos", label: "All videos" }}
    >
      <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2">
        {videos.map((video) => (
          <li key={video.id}>
            <VideoCard video={video} />
          </li>
        ))}
      </ul>
    </HomeSection>
  );
}

async function FromTheShop() {
  const products = (await getShopProducts()).slice(0, 4);
  if (!products.length) return null;
  return (
    <HomeSection
      id="shop-heading"
      title="From the shop"
      link={{ href: "/shop", label: "Visit the shop" }}
    >
      <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
        {products.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </HomeSection>
  );
}
