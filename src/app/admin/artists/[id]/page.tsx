import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { Container } from "@/components/ui/container";
import { COUNTRIES } from "@/lib/countries";
import {
  addAvailability,
  deleteArtist,
  deleteArtistImage,
  deleteAvailability,
  setArtistPressKit,
  toggleAvailabilityPublic,
  registerArtistImage,
  saveArtistLinks,
  setArtistCover,
  setArtistPortrait,
  updateArtistDetails,
  updateArtistPrivate,
} from "@/modules/artists/actions";
import {
  getArtistExtras,
  getArtistForAdmin,
} from "@/modules/artists/admin-queries";
import { AvailabilityEditor } from "@/modules/artists/components/admin/availability-editor";
import { PressKitPicker } from "@/modules/artists/components/admin/press-kit-picker";
import { MIGRATION_NOTICE } from "@/lib/supabase/schema-errors";
import { ArtistDetailsForm } from "@/modules/artists/components/admin/artist-details-form";
import { ArtistLinksForm } from "@/modules/artists/components/admin/artist-links-form";
import { ArtistPrivateForm } from "@/modules/artists/components/admin/artist-private-form";
import { DeleteArtistForm } from "@/modules/artists/components/admin/delete-artist-form";
import { StatusBadge } from "@/components/admin/admin-ui";
import { ImageGrid } from "@/modules/media/components/image-grid";
import { ImageUploader } from "@/modules/media/components/image-uploader";
import { GUIDELINES_PATH } from "@/modules/media/image-specs";
import { mediaFolder } from "@/modules/media/server";

export const metadata: Metadata = { title: "Edit artist" };

export default function EditArtistPage({
  params,
}: PageProps<"/admin/artists/[id]">) {
  return (
    <Container className="py-12">
      <Link
        href="/admin/artists"
        className="text-sm text-muted hover:text-text"
      >
        ← All artists
      </Link>
      <Suspense fallback={<p className="mt-10 text-muted">Loading artist…</p>}>
        <Editor params={params} />
      </Suspense>
    </Container>
  );
}

async function Editor({
  params,
}: {
  params: PageProps<"/admin/artists/[id]">["params"];
}) {
  const { id } = await params;
  const [data, extras] = await Promise.all([
    getArtistForAdmin(id),
    getArtistExtras(id),
  ]);
  if (!data) notFound();
  const { artist, privateInfo, links, images } = data;
  const appearances = [
    ["Events and lineups", extras.appearsIn.events, "/admin/events"],
    ["Videos", extras.appearsIn.videos, "/admin/videos"],
    ["Music releases", extras.appearsIn.releases, "/admin/music/new"],
    ["News posts", extras.appearsIn.posts, "/admin/posts"],
    ["Art Gallery profile", extras.appearsIn.art, "/admin/art/artists"],
  ] as const;

  return (
    <>
      <header className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-headline">{artist.stage_name}</h1>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge status={artist.status} />
          {artist.status === "published" ? (
            <Link
              href={`/artists/${artist.slug}`}
              className="text-sm underline underline-offset-4"
            >
              View public page
            </Link>
          ) : null}
        </div>
      </header>

      <div className="mt-12 flex flex-col gap-16">
        <Section
          title="Details"
          description="Everything here is public once the artist is published."
        >
          <ArtistDetailsForm
            artist={artist}
            action={updateArtistDetails.bind(null, artist.id)}
            countries={COUNTRIES}
          />
        </Section>

        <Section
          title="Photos"
          description="The portrait is shown round on cards and the profile, and as a tile in event lineups. The cover feeds the moving kaleidoscope at the top of the profile. Other photos fill the profile's photo mosaic."
        >
          <div className="flex flex-col gap-8">
            <ImageGrid
              images={images}
              leadId={artist.portrait_asset_id}
              leadLabel="Portrait"
              makeLead={setArtistPortrait.bind(null, artist.id)}
              remove={deleteArtistImage.bind(null, artist.id)}
              second={{
                id: artist.cover_asset_id,
                label: "Cover",
                set: setArtistCover.bind(null, artist.id),
              }}
            />
            <ImageUploader
              folder={mediaFolder("artist", artist.id)}
              register={registerArtistImage.bind(null, artist.id)}
              multiple
              guidelinesHref={GUIDELINES_PATH}
              roles={[
                {
                  spec: "artist-portrait",
                  label: "Portrait",
                  assign: setArtistPortrait.bind(null, artist.id),
                },
                {
                  spec: "artist-cover",
                  label: "Cover",
                  assign: setArtistCover.bind(null, artist.id),
                },
                { spec: "artist-photo", label: "Profile photos" },
              ]}
            />
          </div>
        </Section>

        <Section title="Links" description="Music, socials and website.">
          <ArtistLinksForm
            links={links}
            action={saveArtistLinks.bind(null, artist.id)}
          />
        </Section>

        <Section
          title="Dates and availability"
          description="Tour windows, booked dates and open periods. Only windows marked Public show on the artist page, next to the booking button."
        >
          {extras.enabled ? (
            <AvailabilityEditor
              rows={extras.availability}
              addAction={addAvailability.bind(null, artist.id)}
              remove={deleteAvailability.bind(null, artist.id)}
              togglePublic={toggleAvailabilityPublic.bind(null, artist.id)}
            />
          ) : (
            <p className="text-sm text-muted">{MIGRATION_NOTICE}</p>
          )}
        </Section>

        <Section
          title="Press kit"
          description="A public PDF (EPK, rider summary, bio) promoters can download from the artist page. Stored in the media library."
        >
          {extras.enabled ? (
            <PressKitPicker
              current={extras.pressKitId}
              documents={extras.documents}
              action={setArtistPressKit.bind(null, artist.id)}
            />
          ) : (
            <p className="text-sm text-muted">{MIGRATION_NOTICE}</p>
          )}
        </Section>

        <Section
          title="Appears in"
          description="Everywhere this artist is linked. Add them to an event lineup on the event, to a video or post on its page."
        >
          <div className="grid gap-6 sm:grid-cols-2">
            {appearances.map(([label, items, addHref]) => (
              <div key={label}>
                <p className="font-label text-xs text-accent">{label}</p>
                {items.length ? (
                  <ul className="mt-2 flex flex-col gap-1 text-sm">
                    {items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="underline-offset-4 hover:text-accent hover:underline"
                        >
                          {item.label}
                        </Link>{" "}
                        <span className="font-label text-xs text-muted">
                          {item.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted">
                    None yet.{" "}
                    <Link
                      href={addHref}
                      className="underline underline-offset-4"
                    >
                      Go there
                    </Link>
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Private booking info"
          description="Only staff (and the artist's own team) can see this. Never shown publicly."
        >
          <ArtistPrivateForm
            privateInfo={privateInfo}
            action={updateArtistPrivate.bind(null, artist.id)}
          />
        </Section>

        <Section
          title="Delete"
          description="Removes the artist and their photos for good. Archive instead if you may need them again."
        >
          <DeleteArtistForm
            name={artist.stage_name}
            action={deleteArtist.bind(null, artist.id)}
          />
        </Section>
      </div>
    </>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-6 border-t border-line pt-8 lg:grid-cols-[16rem_1fr] lg:gap-12">
      <div>
        <h2 className="font-display text-3xl">{title}</h2>
        <p className="mt-2 text-sm text-muted">{description}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}
