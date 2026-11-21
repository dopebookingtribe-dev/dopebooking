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
import { COUNTRIES } from "@/lib/countries";
import {
  deleteArtItem,
  makeArtLeadImage,
  registerExhibitionPhoto,
  saveExhibitionArtworks,
  saveExhibitionParticipants,
  saveExhibitionPartners,
  setExhibitionMobileCover,
  updateArtExhibitionDetails,
} from "@/modules/art/actions";
import { getArtExhibitionForAdmin } from "@/modules/art/admin-queries";
import { StatusControls } from "@/modules/art/components/admin/admin-shell";
import { ExhibitionImages } from "@/modules/art/components/admin/exhibition-images";
import {
  DeleteItemForm,
  ExhibitionDetailsForm,
  OrderedPickerForm,
  ParticipantsForm,
  PartnersForm,
} from "@/modules/art/components/admin/forms";
import { PhotoSetUploader } from "@/modules/art/components/admin/photo-set-uploader";
import { VideoLinks } from "@/modules/art/components/admin/video-links";
import { COLLECTIONS, PHOTO_COLLECTIONS } from "@/modules/art/schemas";
import { ImageUploader } from "@/modules/media/components/image-uploader";
import { GUIDELINES_PATH } from "@/modules/media/image-specs";
import { mediaFolder } from "@/modules/media/server";

export const metadata: Metadata = { title: "Edit exhibition" };

export default function EditArtExhibitionPage({
  params,
}: PageProps<"/admin/art/exhibitions/[id]">) {
  return (
    <Container className="py-12">
      <Suspense fallback={<p className="text-muted">Loading exhibition…</p>}>
        <Editor params={params} />
      </Suspense>
    </Container>
  );
}

async function Editor({
  params,
}: {
  params: PageProps<"/admin/art/exhibitions/[id]">["params"];
}) {
  const { id } = await params;
  const data = await getArtExhibitionForAdmin(id);
  if (!data) notFound();
  const {
    exhibition,
    lineup,
    artworkIds,
    images,
    partners,
    festivals,
    events,
    workOptions,
    artistOptions,
    videos,
  } = data;
  const folder = mediaFolder("art-exhibition", exhibition.id);
  const photoCount = images.filter(
    (i) => i.collection && i.collection !== "logo",
  ).length;
  const logos = images.filter((i) => i.collection === "logo");

  return (
    <>
      <AdminHeader
        title={exhibition.title}
        eyebrow="Edit exhibition"
        backHref="/admin/art/exhibitions"
        backLabel="All exhibitions"
      >
        <StatusBadge status={exhibition.status} />
        {exhibition.status === "published" ? (
          <Link
            href={`/art-gallery/exhibitions/${exhibition.slug}`}
            className="text-sm underline underline-offset-4"
          >
            View public page
          </Link>
        ) : null}
      </AdminHeader>
      <div className="mt-6">
        <StatusControls
          kind="exhibition"
          id={exhibition.id}
          status={exhibition.status}
        />
      </div>

      <div className="mt-12 flex flex-col gap-16">
        <EditSection
          title="Details"
          description="Public once the exhibition is published. Now on view, upcoming and archive follow the dates."
        >
          <ExhibitionDetailsForm
            exhibition={exhibition}
            action={updateArtExhibitionDetails.bind(null, exhibition.id)}
            countries={COUNTRIES}
            festivals={festivals}
            events={events}
          />
        </EditSection>

        <EditSection
          title="Artists"
          description="Who took part and their roles in this show (curator, featured artist, installation, live painting…). An artist can hold several roles. Order is the display order."
        >
          <ParticipantsForm
            lineup={lineup}
            options={artistOptions.map((a) => ({
              id: a.id,
              label: a.name,
              hint:
                [
                  a.kind === "collective" ? "collective" : null,
                  a.status !== "published" ? a.status : null,
                ]
                  .filter(Boolean)
                  .join(", ") || undefined,
            }))}
            action={saveExhibitionParticipants.bind(null, exhibition.id)}
          />
          <p className="mt-4 text-sm text-muted">
            Missing someone?{" "}
            <Link
              href="/admin/art/artists/new"
              className="underline underline-offset-4"
            >
              Create an artist profile
            </Link>{" "}
            first. Unpublished artists stay hidden on the public page.
          </p>
        </EditSection>

        <EditSection
          title="Collection"
          description="The artworks shown, in display order. A work can appear in several exhibitions; credits are set on the artwork."
        >
          <OrderedPickerForm
            name="artwork_id"
            selected={artworkIds}
            options={workOptions.map((w) => ({
              id: w.id,
              label: w.title,
              hint:
                [w.year, w.status !== "published" ? w.status : null]
                  .filter(Boolean)
                  .join(" · ") || undefined,
            }))}
            action={saveExhibitionArtworks.bind(null, exhibition.id)}
            addLabel="Add an artwork…"
            saveLabel="Save collection"
            emptyText="No artworks yet. Create artworks under Artworks, then add them here."
          />
          <p className="mt-4 text-sm">
            <Link
              href="/admin/art/artworks/new"
              className="underline underline-offset-4"
            >
              Create a new artwork
            </Link>
          </p>
        </EditSection>

        <EditSection
          title="Cover"
          description="The full-screen header and the exhibition cards. An optional upright phone cover replaces it on phones. Covers don't appear in the photo sets."
        >
          <ImageUploader
            folder={folder}
            register={registerExhibitionPhoto.bind(null, exhibition.id, null)}
            guidelinesHref={GUIDELINES_PATH}
            roles={[
              {
                spec: "art-exhibition-cover",
                label: "Cover",
                assign: makeArtLeadImage.bind(
                  null,
                  "exhibition",
                  exhibition.id,
                ),
              },
              {
                spec: "art-exhibition-cover-mobile",
                label: "Phone cover",
                assign: setExhibitionMobileCover.bind(null, exhibition.id),
              },
            ]}
          />
        </EditSection>

        <EditSection
          title="Photography"
          description={`Curated sets instead of one long grid: ${PHOTO_COLLECTIONS.map((k) => COLLECTIONS[k].toLowerCase()).join(", ")}. Photos in a set also feed Gallery highlights on the landing page. ${photoCount} photo${photoCount === 1 ? "" : "s"} in sets.`}
        >
          <div className="flex flex-col gap-10">
            <ExhibitionImages
              exhibitionId={exhibition.id}
              images={images}
              coverId={exhibition.cover_asset_id}
              mobileCoverId={exhibition.mobile_cover_asset_id}
            />
            <PhotoSetUploader
              folder={folder}
              guidelinesHref={GUIDELINES_PATH}
              registers={{
                installation: registerExhibitionPhoto.bind(
                  null,
                  exhibition.id,
                  "installation",
                ),
                closeup: registerExhibitionPhoto.bind(
                  null,
                  exhibition.id,
                  "closeup",
                ),
                atmosphere: registerExhibitionPhoto.bind(
                  null,
                  exhibition.id,
                  "atmosphere",
                ),
                process: registerExhibitionPhoto.bind(
                  null,
                  exhibition.id,
                  "process",
                ),
              }}
            />
          </div>
        </EditSection>

        <EditSection
          title="Partners"
          description="Optional sponsors, partners and supporting organisations, shown at the end of the page. Upload logos first, then choose them per partner."
        >
          <div className="flex flex-col gap-8">
            <PartnersForm
              partners={partners}
              logos={logos.map((logo) => ({ id: logo.id, label: logo.alt }))}
              action={saveExhibitionPartners.bind(null, exhibition.id)}
            />
            <ImageUploader
              folder={folder}
              register={registerExhibitionPhoto.bind(
                null,
                exhibition.id,
                "logo",
              )}
              multiple
              guidelinesHref={GUIDELINES_PATH}
              roles={[{ spec: "art-partner-logo", label: "Partner logo" }]}
            />
          </div>
        </EditSection>

        <EditSection
          title="Videos"
          description="Link videos from Admin → Videos: aftermovies, artist talks, time-lapses of the build."
        >
          <VideoLinks
            kind="exhibition"
            ownerId={exhibition.id}
            videos={videos}
            column="art_exhibition_id"
          />
        </EditSection>

        <EditSection
          title="Delete"
          description="Removes the exhibition, its photos, line-up and partners for good. Artworks and artist profiles stay. Archive instead to keep the record."
        >
          <DeleteItemForm
            label={exhibition.title}
            action={deleteArtItem.bind(null, "exhibition", exhibition.id)}
          />
        </EditSection>
      </div>
    </>
  );
}
