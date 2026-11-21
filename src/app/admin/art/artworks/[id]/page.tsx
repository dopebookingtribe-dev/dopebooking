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
  deleteArtImage,
  deleteArtItem,
  makeArtLeadImage,
  registerArtImage,
  saveArtworkCredits,
  saveArtworkExhibitions,
  updateArtworkDetails,
} from "@/modules/art/actions";
import { getArtworkForAdmin } from "@/modules/art/admin-queries";
import { StatusControls } from "@/modules/art/components/admin/admin-shell";
import {
  ArtworkDetailsForm,
  CheckListForm,
  CreditsForm,
  DeleteItemForm,
} from "@/modules/art/components/admin/forms";
import { formatDateRange } from "@/modules/art/schemas";
import { ImageGrid } from "@/modules/media/components/image-grid";
import { ImageUploader } from "@/modules/media/components/image-uploader";
import { GUIDELINES_PATH } from "@/modules/media/image-specs";
import { mediaFolder } from "@/modules/media/server";

export const metadata: Metadata = { title: "Edit artwork" };

export default function EditArtworkPage({
  params,
}: PageProps<"/admin/art/artworks/[id]">) {
  return (
    <Container className="py-12">
      <Suspense fallback={<p className="text-muted">Loading artwork…</p>}>
        <Editor params={params} />
      </Suspense>
    </Container>
  );
}

async function Editor({
  params,
}: {
  params: PageProps<"/admin/art/artworks/[id]">["params"];
}) {
  const { id } = await params;
  const data = await getArtworkForAdmin(id);
  if (!data) notFound();
  const {
    work,
    credits,
    exhibitionIds,
    images,
    exhibitionOptions,
    artistOptions,
  } = data;

  return (
    <>
      <AdminHeader
        title={work.title}
        eyebrow="Edit artwork"
        backHref="/admin/art/artworks"
        backLabel="All artworks"
      >
        <StatusBadge status={work.status} />
        {work.status === "published" ? (
          <Link
            href={`/art-gallery/works/${work.slug}`}
            className="text-sm underline underline-offset-4"
          >
            View public page
          </Link>
        ) : null}
      </AdminHeader>
      <div className="mt-6">
        <StatusControls kind="artwork" id={work.id} status={work.status} />
      </div>

      <div className="mt-12 flex flex-col gap-16">
        <EditSection
          title="Wall label"
          description="Title, year, discipline, medium and size, as on a museum label. Public once published."
        >
          <ArtworkDetailsForm
            work={work}
            action={updateArtworkDetails.bind(null, work.id)}
          />
        </EditSection>

        <EditSection
          title="Made by"
          description="One or more artists. Collaborative works credit everyone and link to each profile."
        >
          <CreditsForm
            credits={credits}
            options={artistOptions.map((a) => ({
              id: a.id,
              label: a.name,
              hint: a.status !== "published" ? a.status : undefined,
            }))}
            action={saveArtworkCredits.bind(null, work.id)}
          />
        </EditSection>

        <EditSection
          title="Images"
          description="The main image is shown whole, never cropped, everywhere. Extra images are details and other views on the artwork page."
        >
          <div className="flex flex-col gap-8">
            <ImageGrid
              images={images}
              leadId={work.image_asset_id}
              leadLabel="Main image"
              makeLead={makeArtLeadImage.bind(null, "artwork", work.id)}
              remove={deleteArtImage.bind(null, "artwork", work.id)}
            />
            <ImageUploader
              folder={mediaFolder("art-artwork", work.id)}
              register={registerArtImage.bind(null, "artwork", work.id)}
              multiple
              defaultAlt={work.title}
              guidelinesHref={GUIDELINES_PATH}
              roles={[
                {
                  spec: "art-artwork",
                  label: "Main image",
                  assign: makeArtLeadImage.bind(null, "artwork", work.id),
                },
                { spec: "art-artwork", label: "Details and other views" },
              ]}
            />
          </div>
        </EditSection>

        <EditSection
          title="Shown at"
          description="Exhibitions this work was part of. Its position in each exhibition is set on the exhibition page."
        >
          <CheckListForm
            name="exhibition_id"
            selected={exhibitionIds}
            options={exhibitionOptions.map((e) => ({
              id: e.id,
              label: e.title,
              hint: [
                formatDateRange(e.starts_on, null),
                e.status !== "published" ? e.status : null,
              ]
                .filter(Boolean)
                .join(" · "),
            }))}
            action={saveArtworkExhibitions.bind(null, work.id)}
            emptyText="No exhibitions yet."
          />
        </EditSection>

        <EditSection
          title="Delete"
          description="Removes the artwork and its images for good. Archive instead to keep it in the record."
        >
          <DeleteItemForm
            label={work.title}
            action={deleteArtItem.bind(null, "artwork", work.id)}
          />
        </EditSection>
      </div>
    </>
  );
}
