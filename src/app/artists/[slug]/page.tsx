import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { countryName } from "@/lib/countries";
import { genreLabels } from "@/modules/artists/components/artist-card";
import { getPublishedArtist } from "@/modules/artists/queries";
import { LINK_PLATFORMS } from "@/modules/artists/schemas";

type Props = PageProps<"/artists/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getPublishedArtist(slug);
  if (!artist) return { title: "Artist not found" };

  const description =
    artist.tagline ??
    artist.bio?.slice(0, 155) ??
    `Book ${artist.stageName} through DopeBooking.`;
  return {
    title: artist.stageName,
    description,
    alternates: { canonical: `/artists/${artist.slug}` },
    openGraph: {
      title: `${artist.stageName} · DopeBooking`,
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
  const gallery = artist.images.filter(
    (image) => image.id !== artist.portrait?.id,
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

  return (
    <>
      <script
        type="application/ld+json"
        // Escape "<" so profile text can't close the script tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <Container className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="relative aspect-[4/5] overflow-hidden rounded-(--radius) bg-surface-2">
            {artist.portrait ? (
              <Image
                src={artist.portrait.url}
                alt={artist.portrait.alt}
                fill
                priority
                sizes="(min-width: 1024px) 42vw, 92vw"
                className="object-cover"
              />
            ) : (
              <div
                aria-hidden
                className="flex size-full items-end p-8 font-display text-9xl text-line-strong"
              >
                {artist.stageName.slice(0, 1)}
              </div>
            )}
          </div>
          {artist.portrait?.credit ? (
            <p className="mt-2 font-mono text-[0.7rem] tracking-[0.12em] text-muted uppercase">
              Photo: {artist.portrait.credit}
            </p>
          ) : null}
        </div>

        <div>
          <Link
            href="/artists"
            className="text-sm text-muted transition-colors hover:text-text"
          >
            ← All artists
          </Link>
          {meta.length ? (
            <Meta className="mt-8">{meta.join(" · ")}</Meta>
          ) : null}
          <h1 className="mt-4 font-display text-display">{artist.stageName}</h1>
          {artist.tagline ? (
            <p className="mt-6 text-xl text-muted">{artist.tagline}</p>
          ) : null}

          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href={`/book/${artist.slug}`}>
              Request booking
            </ButtonLink>
          </div>

          {paragraphs.length ? (
            <div className="mt-14 flex max-w-prose flex-col gap-5 text-lg leading-relaxed">
              {paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          ) : null}

          {artist.links.length ? (
            <section aria-labelledby="links-heading" className="mt-14">
              <h2 id="links-heading">
                <Meta>Listen &amp; follow</Meta>
              </h2>
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {artist.links.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="group flex min-h-14 items-center justify-between gap-4"
                    >
                      <span className="font-display text-2xl transition-colors group-hover:text-accent">
                        {LINK_PLATFORMS[link.platform]}
                      </span>
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
      </Container>

      {gallery.length ? (
        <section aria-labelledby="gallery-heading" className="pb-24">
          <Container>
            <h2 id="gallery-heading" className="font-display text-headline">
              Gallery
            </h2>
            <ul className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3">
              {gallery.map((image) => (
                <li key={image.id} className="mb-4 break-inside-avoid">
                  <figure>
                    <Image
                      src={image.url}
                      alt={image.alt}
                      width={image.width}
                      height={image.height}
                      sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
                      className="h-auto w-full rounded-(--radius)"
                    />
                    {image.credit ? (
                      <figcaption className="mt-2 font-mono text-[0.7rem] tracking-[0.12em] text-muted uppercase">
                        Photo: {image.credit}
                      </figcaption>
                    ) : null}
                  </figure>
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
