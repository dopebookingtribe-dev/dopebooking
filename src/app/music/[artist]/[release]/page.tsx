import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TiltHeading } from "@/components/site/tilt-heading";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { Picture } from "@/components/ui/picture";
import { CONTAINERS } from "@/modules/media/image-specs";
import { formatCents } from "@/modules/marketplace/schemas";
import { BuyButtons } from "@/modules/music/components/buy-buttons";
import { ReleaseCard } from "@/modules/music/components/release-card";
import {
  PlayAll,
  TrackList,
  type TrackListItem,
} from "@/modules/music/components/track-list";
import {
  getPublishedReleases,
  getRelease,
  releaseHref,
  type ReleaseDetail,
} from "@/modules/music/queries";
import { FILE_FORMATS, RELEASE_TYPES } from "@/modules/music/schemas";

type Props = PageProps<"/music/[artist]/[release]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { artist, release: slug } = await params;
  const release = await getRelease(artist, slug);
  if (!release) return { title: "Release not found" };
  const title = `${release.title} by ${release.artist.name}`;
  const description =
    release.description?.slice(0, 155) ??
    `${RELEASE_TYPES[release.type]} by ${release.artist.name}. Preview and download in ${release.formats.map((f) => FILE_FORMATS[f].label).join(", ")}.`;
  return {
    title,
    description,
    alternates: { canonical: releaseHref(release) },
    openGraph: {
      title: `${title} | DopeBooking Music`,
      description,
      type: "music.album",
      images: release.cover
        ? [
            {
              url: release.cover.url,
              width: release.cover.width,
              height: release.cover.height,
              alt: release.cover.alt,
            },
          ]
        : undefined,
    },
  };
}

export default function ReleasePage({ params }: Props) {
  return (
    <Suspense fallback={<ReleaseSkeleton />}>
      <Release params={params} />
    </Suspense>
  );
}

function trackItems(release: ReleaseDetail): TrackListItem[] {
  const toItem =
    (
      from: ReleaseDetail | ReleaseDetail["bundleItems"][number],
      label?: string,
    ) =>
    (track: ReleaseDetail["tracks"][number]): TrackListItem => ({
      id: track.id,
      position: track.position,
      title: track.title,
      duration: track.duration,
      bpm: track.bpm,
      musicalKey: track.musicalKey,
      from: label,
      preview: track.previewUrl
        ? {
            id: track.id,
            title: track.title,
            previewUrl: track.previewUrl,
            duration: track.duration,
            releaseTitle: from.title,
            releaseHref: releaseHref(from),
            artistName: from.artist.name,
            cover: from.cover?.url ?? null,
          }
        : null,
    });
  return release.tracks.map(toItem(release));
}

async function Release({ params }: { params: Props["params"] }) {
  const { artist: artistSlug, release: slug } = await params;
  const release = await getRelease(artistSlug, slug);
  if (!release) notFound();

  // Bundles list the tracks of every release inside them.
  const { tracks: allTracks, releases } = await getPublishedReleases();
  const items =
    release.type === "bundle"
      ? release.bundleItems.flatMap((item) =>
          (allTracks[item.id] ?? []).map((track) => ({
            id: track.id,
            position: track.position,
            title: track.title,
            duration: track.duration,
            bpm: track.bpm,
            musicalKey: track.musicalKey,
            from: item.title,
            preview: track.previewUrl
              ? {
                  id: track.id,
                  title: track.title,
                  previewUrl: track.previewUrl,
                  duration: track.duration,
                  releaseTitle: item.title,
                  releaseHref: releaseHref(item),
                  artistName: item.artist.name,
                  cover: item.cover?.url ?? null,
                }
              : null,
          })),
        )
      : trackItems(release);
  const runtime = items.reduce((sum, track) => sum + (track.duration ?? 0), 0);
  const more = releases.filter(
    (other) => other.artist.id === release.artist.id && other.id !== release.id,
  );
  const separatePrice = release.bundleItems.reduce(
    (sum, item) => sum + (item.price ?? 0),
    0,
  );

  const facts = [
    release.releaseDate
      ? [
          "Released",
          new Date(release.releaseDate).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
            timeZone: "UTC",
          }),
        ]
      : null,
    release.bpm ? ["BPM", String(release.bpm)] : null,
    release.musicalKey ? ["Key", release.musicalKey] : null,
    release.label ? ["Label", release.label] : null,
    release.catalogNumber ? ["Catalogue", release.catalogNumber] : null,
    runtime ? ["Length", `${Math.round(runtime / 60)} min`] : null,
  ].filter((fact): fact is string[] => fact !== null);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": release.type === "track" ? "MusicRecording" : "MusicAlbum",
    name: release.title,
    byArtist: { "@type": "MusicGroup", name: release.artist.name },
    ...(release.cover ? { image: release.cover.url } : {}),
    ...(release.type !== "track" ? { numTracks: items.length } : {}),
    ...(release.price !== null
      ? {
          offers: {
            "@type": "Offer",
            price: (release.price / 100).toFixed(2),
            priceCurrency: release.currency,
            availability: release.onSale
              ? "https://schema.org/InStock"
              : "https://schema.org/Discontinued",
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Escape "<" so release text can never close the script tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <section className="relative isolate overflow-hidden border-b border-line">
        {release.cover ? (
          <div
            aria-hidden
            className="absolute inset-0 -z-10 opacity-30 blur-3xl saturate-150"
          >
            <Picture image={release.cover} decorative sizes="40vw" />
          </div>
        ) : null}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-bg/40 via-bg/80 to-bg"
        />
        <Container className="grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
          <div className="relative aspect-square w-full max-w-lg">
            <div
              aria-hidden
              className="sleeve-disc absolute inset-[3%] translate-x-[18%] rotate-12 rounded-full shadow-2xl shadow-black/60"
            />
            <div
              className={`relative ${CONTAINERS.releaseCover} overflow-hidden rounded-(--radius) bg-surface-2 shadow-2xl shadow-black/60`}
            >
              {release.cover ? (
                <Picture
                  image={release.cover}
                  priority
                  sizes="(min-width: 1024px) 38vw, 92vw"
                />
              ) : null}
            </div>
          </div>
          <div>
            <Meta>
              {RELEASE_TYPES[release.type]}
              {(release.subgenre ?? release.genre)
                ? ` · ${(release.subgenre ?? release.genre)!.name}`
                : ""}
            </Meta>
            <TiltHeading
              className="mt-4 text-5xl leading-[0.95] sm:text-7xl"
              strength={22}
            >
              {release.title}
            </TiltHeading>
            <p className="mt-5 text-xl">
              <Link
                href={`/artists/${release.artist.slug}`}
                className="text-muted underline-offset-4 hover:text-text hover:underline"
              >
                {release.artist.name}
              </Link>
            </p>
            {facts.length ? (
              <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
                {facts.map(([label, value]) => (
                  <div key={label}>
                    <dt className="font-label text-xs text-muted">{label}</dt>
                    <dd className="mt-0.5">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <div className="mt-10 flex flex-col gap-5">
              <PlayAll tracks={items} />
              <BuyButtons
                releaseId={release.id}
                price={release.price}
                currency={release.currency}
                onSale={release.onSale}
              />
              {release.type === "bundle" &&
              separatePrice > (release.price ?? 0) ? (
                <p className="text-sm text-success">
                  Save{" "}
                  {formatCents(
                    separatePrice - (release.price ?? 0),
                    release.currency,
                  )}{" "}
                  compared with buying each release.
                </p>
              ) : null}
              <p className="text-sm text-muted">
                {release.formats.length
                  ? `Download in ${release.formats.map((format) => FILE_FORMATS[format].label).join(", ")}. `
                  : ""}
                Previews are short clips; you get the full tracks after paying.{" "}
                <Link
                  href="/legal/music-license"
                  className="underline underline-offset-4 hover:text-text"
                >
                  Personal licence
                </Link>
              </p>
            </div>
          </div>
        </Container>
      </section>

      <Container className="grid gap-16 py-16 sm:py-20 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section aria-labelledby="tracks-heading">
          <h2 id="tracks-heading" className="font-display text-3xl">
            {release.type === "track" ? "Track" : `Tracklist · ${items.length}`}
          </h2>
          <div className="mt-6">
            <TrackList tracks={items} />
          </div>
        </section>
        <div className="flex flex-col gap-10">
          {release.description ? (
            <section aria-labelledby="about-heading">
              <h2 id="about-heading" className="font-display text-2xl">
                About
              </h2>
              <p className="mt-4 leading-relaxed whitespace-pre-line text-muted">
                {release.description}
              </p>
            </section>
          ) : null}
          {release.credits ? (
            <section aria-labelledby="credits-heading">
              <h2 id="credits-heading" className="font-display text-2xl">
                Credits
              </h2>
              <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-muted">
                {release.credits}
              </p>
            </section>
          ) : null}
        </div>
      </Container>

      {release.type === "bundle" && release.bundleItems.length ? (
        <section aria-labelledby="inside-heading" className="pb-16">
          <Container>
            <h2 id="inside-heading" className="font-display text-3xl">
              In this bundle
            </h2>
            <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-12 sm:grid-cols-3 lg:grid-cols-5">
              {release.bundleItems.map((item) => (
                <li key={item.id}>
                  <ReleaseCard release={item} showArtist={false} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

      {more.length ? (
        <section
          aria-labelledby="more-heading"
          className="border-t border-line bg-surface-1 py-16 sm:py-20"
        >
          <Container>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="more-heading" className="font-display text-3xl">
                More from {release.artist.name}
              </h2>
              <ButtonLink
                href={`/artists/${release.artist.slug}#music`}
                variant="text"
              >
                Artist profile
              </ButtonLink>
            </div>
            <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-12 sm:grid-cols-3 lg:grid-cols-5">
              {more.slice(0, 10).map((other) => (
                <li key={other.id}>
                  <ReleaseCard release={other} showArtist={false} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}
    </>
  );
}

function ReleaseSkeleton() {
  return (
    <Container className="grid gap-12 py-20 lg:grid-cols-2" aria-hidden>
      <div className="aspect-square max-w-lg animate-pulse rounded-(--radius) bg-surface-1" />
      <div className="flex flex-col gap-4">
        <div className="h-4 w-32 animate-pulse rounded bg-surface-1" />
        <div className="h-16 w-3/4 animate-pulse rounded bg-surface-1" />
        <div className="h-6 w-40 animate-pulse rounded bg-surface-1" />
      </div>
    </Container>
  );
}
