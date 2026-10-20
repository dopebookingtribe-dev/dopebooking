import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { ArtistCard } from "@/modules/artists/components/artist-card";
import { getPublishedArtists } from "@/modules/artists/queries";
import { EventRow } from "@/modules/events/components/event-row";
import { getPublishedEvents } from "@/modules/events/queries";
import { ProductCard } from "@/modules/marketplace/components/product-card";
import { getShopProducts } from "@/modules/marketplace/queries";
import { VideoCard } from "@/modules/videos/components/video-card";
import { getPublishedVideos } from "@/modules/videos/queries";

const PILLARS = [
  {
    href: "/artists",
    index: "01",
    title: "Artists",
    body: "A curated roster of international psytrance acts, from progressive sunrise sets to full-on night journeys.",
  },
  {
    href: "/gallery",
    index: "02",
    title: "Events & media",
    body: "Festival photography, aftermovies and the stories behind the stages we help build.",
  },
  {
    href: "/services",
    index: "03",
    title: "Festival services",
    body: "Promotion campaigns, festival catering, and photo, video and aftermovie production.",
  },
] as const;

export default function HomePage() {
  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-line">
        {/* Placeholder for cinematic festival photography (Phase 03). */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_70%_10%,#1f2a0b_0%,transparent_55%),radial-gradient(90%_70%_at_10%_90%,#1a1430_0%,transparent_60%)]"
        />
        <Container className="flex min-h-[78svh] flex-col justify-end pt-24 pb-16 sm:pb-24">
          <Meta>International psytrance agency · Est. Germany</Meta>
          <h1 className="mt-6 max-w-5xl font-display text-display">
            Artists for the <em className="text-accent">dancefloor</em> at the
            edge of the night.
          </h1>
          <p className="mt-8 max-w-xl text-lg text-muted">
            DopeBooking connects festivals and promoters with international
            psytrance artists, and the people who make the weekend happen.
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
      <Suspense fallback={null}>
        <UpcomingEvents />
      </Suspense>
      <Suspense fallback={null}>
        <LatestVideos />
      </Suspense>
      <Suspense fallback={null}>
        <FromTheShop />
      </Suspense>

      <section aria-labelledby="pillars-heading" className="py-20 sm:py-28">
        <Container>
          <h2 id="pillars-heading" className="sr-only">
            What we do
          </h2>
          <ul className="grid gap-px overflow-hidden rounded-(--radius) border border-line bg-line md:grid-cols-3">
            {PILLARS.map((pillar) => (
              <li key={pillar.href} className="bg-bg">
                <Link
                  href={pillar.href}
                  className="group flex h-full flex-col p-8 transition-colors duration-300 hover:bg-surface-1"
                >
                  <Meta>{pillar.index}</Meta>
                  <h3 className="mt-10 font-display text-4xl transition-colors group-hover:text-accent">
                    {pillar.title}
                  </h3>
                  <p className="mt-4 text-muted">{pillar.body}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </>
  );
}

function HomeSection({
  id,
  eyebrow,
  title,
  link,
  children,
}: {
  id: string;
  eyebrow: string;
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
          <div>
            <Meta>{eyebrow}</Meta>
            <h2 id={id} className="mt-3 font-display text-headline">
              {title}
            </h2>
          </div>
          <Link
            href={link.href}
            className="text-sm underline underline-offset-4 hover:text-accent"
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
      eyebrow="Roster"
      title="Featured artists"
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
      eyebrow="Calendar"
      title="Next up"
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
      eyebrow="Media"
      title="Latest videos"
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
      eyebrow="Marketplace"
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
