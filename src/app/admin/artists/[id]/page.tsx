import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { Container } from "@/components/ui/container";
import { COUNTRIES } from "@/lib/countries";
import {
  deleteArtistImage,
  registerArtistImage,
  saveArtistLinks,
  setArtistPortrait,
  updateArtistDetails,
  updateArtistPrivate,
} from "@/modules/artists/actions";
import { getArtistForAdmin } from "@/modules/artists/admin-queries";
import { ArtistDetailsForm } from "@/modules/artists/components/admin/artist-details-form";
import { ArtistLinksForm } from "@/modules/artists/components/admin/artist-links-form";
import { ArtistPrivateForm } from "@/modules/artists/components/admin/artist-private-form";
import { StatusBadge } from "@/components/admin/admin-ui";
import { ImageGrid } from "@/modules/media/components/image-grid";
import { ImageUploader } from "@/modules/media/components/image-uploader";
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
  const data = await getArtistForAdmin(id);
  if (!data) notFound();
  const { artist, privateInfo, links, images } = data;

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
          description="The portrait leads the profile and directory card. Portrait (4:5) photos work best."
        >
          <div className="flex flex-col gap-8">
            <ImageGrid
              images={images}
              leadId={artist.portrait_asset_id}
              leadLabel="Portrait"
              makeLead={setArtistPortrait.bind(null, artist.id)}
              remove={deleteArtistImage.bind(null, artist.id)}
            />
            <ImageUploader
              folder={mediaFolder("artist", artist.id)}
              register={registerArtistImage.bind(null, artist.id)}
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
          title="Private booking info"
          description="Only staff (and the artist's own team) can see this. Never shown publicly."
        >
          <ArtistPrivateForm
            privateInfo={privateInfo}
            action={updateArtistPrivate.bind(null, artist.id)}
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
