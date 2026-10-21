import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { requirePermission } from "@/lib/auth/permissions";
import { registerLibraryImage } from "@/modules/cms/actions";
import { listLibraryImages } from "@/modules/cms/admin-queries";
import { LibraryGrid } from "@/modules/cms/components/library-grid";
import { ImageUploader } from "@/modules/media/components/image-uploader";

export const metadata: Metadata = { title: "Media library" };

export default function MediaLibraryPage() {
  return (
    <Container className="py-16">
      <AdminHeader title="Media library" />
      <p className="mt-4 max-w-2xl text-muted">
        Photos for page sections: heroes, galleries, services and share images.
        Artist, event and product photos are managed on their own pages.
      </p>
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <Library />
      </Suspense>
    </Container>
  );
}

async function Library() {
  await requirePermission("pages.edit", "/admin/media");
  const images = await listLibraryImages();
  return (
    <>
      <div className="mt-10 max-w-2xl">
        <ImageUploader
          folder="library/site"
          multiple
          register={registerLibraryImage}
        />
      </div>
      <h2 className="mt-14 font-display text-2xl">
        {images.length} {images.length === 1 ? "photo" : "photos"}
      </h2>
      <LibraryGrid images={images} />
    </>
  );
}
