import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { DemoBadge } from "@/components/ui/demo-badge";
import {
  ArtHeader,
  ArtParagraphs,
  ArtShell,
  JsonLd,
  siteUrl,
  TimingBadge,
} from "@/modules/art/components/art-ui";
import { ArtworkGrid } from "@/modules/art/components/artwork-grid";
import { artworkLines } from "@/modules/art/format";
import { ArtworkImages } from "@/modules/art/components/artwork-images";
import { getArtCatalog, getArtworkImages } from "@/modules/art/queries";
import {
  DISCIPLINES,
  formatDateRange,
  isDiscipline,
} from "@/modules/art/schemas";
import { getSiteSettings } from "@/modules/cms/queries";

type Props = PageProps<"/art-gallery/works/[slug]">;

async function load(slug: string) {
  const catalog = await getArtCatalog();
  const work = catalog.works.find((w) => w.slug === slug);
  return work ? { catalog, work } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) return { title: "Artwork not found" };
  const { work } = data;
  const by = work.credits.map((c) => c.artist.name).join(" & ");
  const description =
    work.description?.slice(0, 155) ??
    [by, ...artworkLines(work)].filter(Boolean).join(" · ");
  return {
    title: by ? `${work.title} by ${by}` : work.title,
    description,
    alternates: { canonical: `/art-gallery/works/${work.slug}` },
    openGraph: {
      title: `${work.title} | DopeBooking Art Gallery`,
      description,
      images: work.image
        ? [
            {
              url: work.image.url,
              width: work.image.width,
              height: work.image.height,
              alt: work.image.alt,
            },
          ]
        : undefined,
    },
  };
}

export default function ArtworkPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div aria-hidden className="min-h-[70svh] animate-pulse bg-surface-1" />
      }
    >
      <Artwork params={params} />
    </Suspense>
  );
}

async function Artwork({ params }: { params: Props["params"] }) {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) notFound();
  const { catalog, work } = data;
  const [images, settings] = await Promise.all([
    getArtworkImages(work.id),
    getSiteSettings(),
  ]);
  const exhibitions = catalog.exhibitions.filter((e) =>
    work.exhibitionIds.includes(e.id),
  );
  const creatorIds = new Set(work.credits.map((c) => c.artist.id));
  const more = catalog.works
    .filter(
      (w) =>
        w.id !== work.id && w.credits.some((c) => creatorIds.has(c.artist.id)),
    )
    .slice(0, 6);
  const ordered = work.image
    ? [work.image, ...images.filter((i) => i.id !== work.image!.id)]
    : images;
  const together = work.credits.length > 1;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    name: work.title,
    url: siteUrl(`/art-gallery/works/${work.slug}`),
    image: work.image?.url,
    description: work.description ?? undefined,
    dateCreated: work.year ? String(work.year) : undefined,
    artform:
      work.discipline && isDiscipline(work.discipline)
        ? DISCIPLINES[work.discipline]
        : undefined,
    artMedium: work.medium ?? undefined,
    creator: work.credits.map((c) => ({
      "@type": "Person",
      name: c.artist.name,
      url: siteUrl(`/art-gallery/artists/${c.artist.slug}`),
    })),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <Container className="grid gap-12 py-12 sm:py-16 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:gap-16">
        <div>
          <Link
            href={
              exhibitions[0]
                ? `/art-gallery/exhibitions/${exhibitions[0].slug}#collection`
                : "/art-gallery"
            }
            className="text-sm text-muted hover:text-text"
          >
            ← {exhibitions[0] ? exhibitions[0].title : "Art Gallery"}
          </Link>
          <div className="mt-8">
            {ordered.length ? (
              <ArtworkImages title={work.title} images={ordered} />
            ) : (
              <div
                className="flex aspect-[4/3] items-center justify-center bg-surface-1 font-serif-art text-8xl text-line-strong italic"
                aria-hidden
              >
                {work.title.slice(0, 1)}
              </div>
            )}
          </div>
        </div>

        {/* The wall label */}
        <aside className="lg:sticky lg:top-24 lg:self-start lg:pt-14">
          <div className="border-l border-accent pl-6">
            {together ? (
              <p className="font-label text-sm text-uv">Made together</p>
            ) : null}
            <h1 className="mt-1 font-serif-art text-[clamp(2.25rem,1.5rem+2vw,3.5rem)] leading-[1.05] text-balance italic">
              {work.title}
            </h1>
            {work.credits.length ? (
              <ul className="mt-5 flex flex-col gap-1 text-lg">
                {work.credits.map((c) => (
                  <li key={c.artist.id}>
                    <Link
                      href={`/art-gallery/artists/${c.artist.slug}`}
                      className="underline decoration-line-strong underline-offset-4 hover:text-accent"
                    >
                      {c.artist.name}
                    </Link>
                    {c.credit ? (
                      <span className="text-muted"> · {c.credit}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
            <ul className="mt-5 flex flex-col gap-1 font-label text-sm text-muted">
              {artworkLines(work).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            {work.isDemo && settings.showDemoLabels ? (
              <DemoBadge className="mt-4" />
            ) : null}
          </div>
          {work.description ? (
            <div className="mt-8 flex flex-col gap-4 leading-relaxed text-text/90">
              <ArtParagraphs text={work.description} />
            </div>
          ) : null}
          {exhibitions.length ? (
            <div className="mt-10">
              <h2 className="font-label text-sm text-muted">Shown at</h2>
              <ul className="mt-3 divide-y divide-line border-y border-line">
                {exhibitions.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/art-gallery/exhibitions/${e.slug}`}
                      className="group flex items-center justify-between gap-4 py-4"
                    >
                      <span>
                        <span className="block font-display text-xl group-hover:text-accent">
                          {e.title}
                        </span>
                        <span className="font-label text-xs text-muted">
                          {[
                            e.festival?.name,
                            formatDateRange(e.startsOn, e.endsOn, e.dateNote),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <TimingBadge timing={e.timing} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <ButtonLink
            href="/art-gallery/collaborate"
            variant="secondary"
            className="mt-10"
          >
            Show work like this at your festival
          </ButtonLink>
        </aside>
      </Container>

      {more.length ? (
        <ArtShell label="More works" band>
          <ArtHeader
            heading={`More by ${work.credits.map((c) => c.artist.name).join(" & ")}`}
          />
          <ArtworkGrid works={more} showDemo={settings.showDemoLabels} />
        </ArtShell>
      ) : null}
    </>
  );
}
