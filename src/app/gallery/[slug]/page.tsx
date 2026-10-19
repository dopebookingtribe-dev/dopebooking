import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { PhotoGrid } from "@/modules/galleries/components/photo-grid";
import { getPublishedGallery } from "@/modules/galleries/queries";

type Props = PageProps<"/gallery/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const gallery = await getPublishedGallery(slug);
  if (!gallery) return { title: "Gallery not found" };
  return {
    title: gallery.title,
    description:
      gallery.description?.slice(0, 155) ?? `Photos: ${gallery.title}`,
    alternates: { canonical: `/gallery/${gallery.slug}` },
    openGraph: {
      title: `${gallery.title} · DopeBooking`,
      images: gallery.cover
        ? [{ url: gallery.cover.url, alt: gallery.cover.alt }]
        : undefined,
    },
  };
}

export default function GalleryPage({ params }: Props) {
  return (
    <Container className="py-16">
      <Link
        href="/gallery"
        className="text-sm text-muted transition-colors hover:text-text"
      >
        ← All galleries
      </Link>
      <Suspense fallback={<p className="mt-10 text-muted">Loading photos…</p>}>
        <Gallery params={params} />
      </Suspense>
    </Container>
  );
}

async function Gallery({ params }: { params: Props["params"] }) {
  const { slug } = await params;
  const gallery = await getPublishedGallery(slug);
  if (!gallery) notFound();

  return (
    <>
      <Meta className="mt-8">
        {gallery.images.length} photos
        {gallery.photographer ? ` · Photography: ${gallery.photographer}` : ""}
      </Meta>
      <h1 className="mt-4 font-display text-display">{gallery.title}</h1>
      {gallery.event ? (
        <p className="mt-4 text-muted">
          From{" "}
          <Link
            href={`/events/${gallery.event.slug}`}
            className="text-text underline underline-offset-4"
          >
            {gallery.event.title}
          </Link>
        </p>
      ) : null}
      {gallery.description ? (
        <p className="mt-6 max-w-prose text-lg text-muted">
          {gallery.description}
        </p>
      ) : null}
      <div className="mt-12">
        {gallery.images.length ? (
          <PhotoGrid images={gallery.images} />
        ) : (
          <p className="text-muted">Photos coming soon.</p>
        )}
      </div>
    </>
  );
}
