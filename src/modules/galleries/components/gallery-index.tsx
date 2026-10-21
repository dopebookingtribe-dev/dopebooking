import { MediaTabs } from "@/components/site/media-tabs";
import { Container } from "@/components/ui/container";
import { getPublishedGalleries } from "../queries";
import { GalleryCard } from "./gallery-card";

export async function GalleryIndex() {
  const galleries = await getPublishedGalleries();
  return (
    <Container className="py-12 sm:py-16">
      <MediaTabs active="photos" />
      {galleries.length ? (
        <ul className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2">
          {galleries.map((gallery, index) => (
            <li key={gallery.id}>
              <GalleryCard gallery={gallery} priority={index < 2} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-10 text-lg text-muted">
          The first galleries are being edited.
        </p>
      )}
    </Container>
  );
}
