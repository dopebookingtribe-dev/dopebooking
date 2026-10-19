import type { Metadata } from "next";
import { Suspense } from "react";
import { MediaTabs } from "@/components/site/media-tabs";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { GalleryCard } from "@/modules/galleries/components/gallery-card";
import { getPublishedGalleries } from "@/modules/galleries/queries";

export const metadata: Metadata = {
  title: "Photo galleries",
  description: "Festival photography from events with DopeBooking artists.",
  alternates: { canonical: "/gallery" },
};

export default function GalleryIndexPage() {
  return (
    <Container className="py-16 sm:py-24">
      <Meta>Media</Meta>
      <h1 className="mt-4 font-display text-display">Photos</h1>
      <MediaTabs active="photos" />
      <Suspense
        fallback={<p className="mt-16 text-muted">Loading galleries…</p>}
      >
        <Galleries />
      </Suspense>
    </Container>
  );
}

async function Galleries() {
  const galleries = await getPublishedGalleries();
  if (!galleries.length) {
    return (
      <p className="mt-16 text-muted">The first galleries are being edited.</p>
    );
  }
  return (
    <ul className="mt-12 grid gap-x-6 gap-y-12 sm:grid-cols-2">
      {galleries.map((gallery, index) => (
        <li key={gallery.id}>
          <GalleryCard gallery={gallery} priority={index < 2} />
        </li>
      ))}
    </ul>
  );
}
