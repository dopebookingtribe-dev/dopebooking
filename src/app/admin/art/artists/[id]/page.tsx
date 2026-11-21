import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  AdminHeader,
  EditSection,
  StatusBadge,
} from "@/components/admin/admin-ui";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { COUNTRIES } from "@/lib/countries";
import {
  deleteArtImage,
  deleteArtItem,
  makeArtLeadImage,
  registerArtImage,
  saveArtArtistLinks,
  saveCollectiveMembers,
  setArtArtistCover,
  updateArtArtistDetails,
} from "@/modules/art/actions";
import { getArtArtistForAdmin } from "@/modules/art/admin-queries";
import { StatusControls } from "@/modules/art/components/admin/admin-shell";
import {
  ArtistDetailsForm,
  ArtLinksForm,
  DeleteItemForm,
  MembersForm,
} from "@/modules/art/components/admin/forms";
import { VideoLinks } from "@/modules/art/components/admin/video-links";
import { roleLabels } from "@/modules/art/schemas";
import { ImageGrid } from "@/modules/media/components/image-grid";
import { ImageUploader } from "@/modules/media/components/image-uploader";
import { GUIDELINES_PATH } from "@/modules/media/image-specs";
import { mediaFolder } from "@/modules/media/server";

export const metadata: Metadata = { title: "Edit Art Gallery artist" };

export default function EditArtArtistPage({
  params,
}: PageProps<"/admin/art/artists/[id]">) {
  return (
    <Container className="py-12">
      <Suspense fallback={<p className="text-muted">Loading artist…</p>}>
        <Editor params={params} />
      </Suspense>
    </Container>
  );
}

async function Editor({
  params,
}: {
  params: PageProps<"/admin/art/artists/[id]">["params"];
}) {
  const { id } = await params;
  const data = await getArtArtistForAdmin(id);
  if (!data) notFound();
  const {
    artist,
    links,
    images,
    members,
    memberOf,
    exhibitions,
    works,
    artistOptions,
    musicArtists,
    videos,
  } = data;
  const individuals = artistOptions
    .filter((a) => a.kind === "individual" && a.id !== artist.id)
    .map((a) => ({
      id: a.id,
      label: a.name,
      hint: a.status !== "published" ? a.status : undefined,
    }));
  const collectiveNames = artistOptions.filter((a) => memberOf.includes(a.id));

  return (
    <>
      <AdminHeader
        title={artist.name}
        eyebrow="Edit artist"
        backHref="/admin/art/artists"
        backLabel="All artists"
      >
        <StatusBadge status={artist.status} />
        {artist.status === "published" ? (
          <Link
            href={`/art-gallery/artists/${artist.slug}`}
            className="text-sm underline underline-offset-4"
          >
            View public page
          </Link>
        ) : null}
      </AdminHeader>
      <div className="mt-6">
        <StatusControls kind="artist" id={artist.id} status={artist.status} />
      </div>

      <div className="mt-12 flex flex-col gap-16">
        <EditSection
          title="Profile"
          description="Everything here is public once the artist is published. One profile per artist: link it to exhibitions and artworks instead of entering it twice."
        >
          <ArtistDetailsForm
            artist={artist}
            action={updateArtArtistDetails.bind(null, artist.id)}
            countries={COUNTRIES}
            musicArtists={musicArtists}
          />
        </EditSection>

        <EditSection
          title="Images"
          description="The portrait sits in an arch on cards and the profile. The optional cover is the wide band behind the name. Other photos (studio, process) appear in a mosaic on the profile. Artworks are added under Artworks, not here."
        >
          <div className="flex flex-col gap-8">
            <ImageGrid
              images={images}
              leadId={artist.portrait_asset_id}
              leadLabel="Portrait"
              makeLead={makeArtLeadImage.bind(null, "artist", artist.id)}
              remove={deleteArtImage.bind(null, "artist", artist.id)}
              second={{
                id: artist.cover_asset_id,
                label: "Cover",
                set: setArtArtistCover.bind(null, artist.id),
                clear: setArtArtistCover.bind(null, artist.id, null),
              }}
            />
            <ImageUploader
              folder={mediaFolder("art-artist", artist.id)}
              register={registerArtImage.bind(null, "artist", artist.id)}
              multiple
              defaultAlt={`${artist.name}`}
              guidelinesHref={GUIDELINES_PATH}
              roles={[
                {
                  spec: "art-portrait",
                  label: "Portrait",
                  assign: makeArtLeadImage.bind(null, "artist", artist.id),
                },
                {
                  spec: "art-cover",
                  label: "Cover",
                  assign: setArtArtistCover.bind(null, artist.id),
                },
                {
                  spec: "art-exhibition-photo",
                  label: "Studio & process photos",
                },
              ]}
            />
          </div>
        </EditSection>

        <EditSection
          title="Links"
          description="Social media and portfolio sites. The official website is in the profile above."
        >
          <ArtLinksForm
            links={links}
            action={saveArtArtistLinks.bind(null, artist.id)}
          />
        </EditSection>

        {artist.kind === "collective" ? (
          <EditSection
            title="Members"
            description="Individual artist profiles in this collective, in display order. Their profiles show “Part of” this collective."
          >
            <MembersForm
              members={members}
              options={individuals}
              action={saveCollectiveMembers.bind(null, artist.id)}
            />
          </EditSection>
        ) : collectiveNames.length ? (
          <EditSection
            title="Collectives"
            description="This artist is a member of these collectives (edit on the collective's page)."
          >
            <ul className="flex flex-col gap-2">
              {collectiveNames.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/admin/art/artists/${c.id}`}
                    className="underline underline-offset-4"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </EditSection>
        ) : null}

        <EditSection
          title="Exhibitions and works"
          description="Where this profile is used. Add the artist to an exhibition from the exhibition's page; credit them on an artwork's page."
        >
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="font-label text-sm text-muted">Exhibitions</h3>
              {exhibitions.length ? (
                <ul className="mt-3 flex flex-col gap-2">
                  {exhibitions.map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/admin/art/exhibitions/${e.id}`}
                        className="underline underline-offset-4"
                      >
                        {e.title}
                      </Link>
                      <span className="ml-2 text-sm text-muted">
                        {roleLabels(e.roles).join(", ")}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted">
                  Not in any exhibition yet.
                </p>
              )}
            </div>
            <div>
              <h3 className="font-label text-sm text-muted">Artworks</h3>
              {works.length ? (
                <ul className="mt-3 flex flex-col gap-2">
                  {works.map((w) => (
                    <li key={w.id}>
                      <Link
                        href={`/admin/art/artworks/${w.id}`}
                        className="underline underline-offset-4"
                      >
                        {w.title}
                      </Link>
                      {w.status !== "published" ? (
                        <span className="ml-2 text-sm text-muted">
                          {w.status}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted">
                  No artworks credited yet.
                </p>
              )}
              <ButtonLink
                href={`/admin/art/artworks/new?artist=${artist.id}`}
                variant="secondary"
                className="mt-4"
              >
                Add an artwork by {artist.name}
              </ButtonLink>
            </div>
          </div>
        </EditSection>

        <EditSection
          title="Videos"
          description="Link videos added under Admin → Videos (any YouTube, Vimeo, Mux or Cloudflare Stream link). Published ones show on the profile."
        >
          <VideoLinks
            kind="artist"
            ownerId={artist.id}
            videos={videos}
            column="art_artist_id"
          />
        </EditSection>

        <EditSection
          title="Delete"
          description="Removes the profile, its images, credits and exhibition entries for good. Archive instead to hide it but keep the history."
        >
          <DeleteItemForm
            label={artist.name}
            action={deleteArtItem.bind(null, "artist", artist.id)}
          />
        </EditSection>
      </div>
    </>
  );
}
