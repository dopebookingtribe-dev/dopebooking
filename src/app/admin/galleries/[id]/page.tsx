import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  AdminHeader,
  EditSection,
  StatusBadge,
} from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import {
  deleteGalleryImage,
  registerGalleryImage,
  setGalleryCover,
  updateGalleryDetails,
} from "@/modules/galleries/actions";
import { getGalleryForAdmin } from "@/modules/galleries/admin-queries";
import { GalleryDetailsForm } from "@/modules/galleries/components/admin/gallery-details-form";
import { ImageGrid } from "@/modules/media/components/image-grid";
import { ImageUploader } from "@/modules/media/components/image-uploader";
import { mediaFolder } from "@/modules/media/server";

export const metadata: Metadata = { title: "Edit gallery" };

export default function EditGalleryPage({
  params,
}: PageProps<"/admin/galleries/[id]">) {
  return (
    <Container className="py-12">
      <Suspense fallback={<p className="text-muted">Loading gallery…</p>}>
        <Editor params={params} />
      </Suspense>
    </Container>
  );
}

async function Editor({
  params,
}: {
  params: PageProps<"/admin/galleries/[id]">["params"];
}) {
  const { id } = await params;
  const data = await getGalleryForAdmin(id);
  if (!data) notFound();
  const { gallery, images, eventOptions } = data;

  return (
    <>
      <AdminHeader
        title={gallery.title}
        eyebrow="Edit gallery"
        backHref="/admin/galleries"
        backLabel="All galleries"
      >
        <StatusBadge status={gallery.status} />
        {gallery.status === "published" ? (
          <Link
            href={`/gallery/${gallery.slug}`}
            className="text-sm underline underline-offset-4"
          >
            View public page
          </Link>
        ) : null}
      </AdminHeader>
      <div className="mt-12 flex flex-col gap-16">
        <EditSection
          title="Details"
          description="Public once the gallery is published."
        >
          <GalleryDetailsForm
            gallery={gallery}
            eventOptions={eventOptions}
            action={updateGalleryDetails.bind(null, gallery.id)}
          />
        </EditSection>
        <EditSection
          title={`Photos (${images.length})`}
          description="Select many photos at once. They share one description unless you type another."
        >
          <div className="flex flex-col gap-8">
            <ImageUploader
              folder={mediaFolder("gallery", gallery.id)}
              register={registerGalleryImage.bind(null, gallery.id)}
              multiple
              defaultAlt={`Photo from ${gallery.title}`}
            />
            <ImageGrid
              images={images}
              leadId={gallery.cover_asset_id}
              leadLabel="Cover"
              makeLead={setGalleryCover.bind(null, gallery.id)}
              remove={deleteGalleryImage.bind(null, gallery.id)}
            />
          </div>
        </EditSection>
      </div>
    </>
  );
}
