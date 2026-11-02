import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminHeader, EditSection } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { ImageUploader } from "@/modules/media/components/image-uploader";
import { mediaFolder } from "@/modules/media/server";
import {
  registerReleaseCover,
  submitRelease,
  updateRelease,
  updateTrack,
} from "@/modules/music/actions";
import { ReleaseStatusBadge } from "@/modules/music/components/music-badges";
import {
  BundlePicker,
  ReleaseDetailsForm,
  ReleaseStatusActions,
  SubmitForm,
  TrackRows,
  TrackUploader,
} from "@/modules/music/components/release-forms";
import { getMusicGenres, getReleaseForEdit } from "@/modules/music/queries";
import { RELEASE_TYPES } from "@/modules/music/schemas";

export const metadata: Metadata = { title: "Edit release" };

export default function EditReleasePage({
  params,
}: PageProps<"/dashboard/music/[id]">) {
  return (
    <Container className="py-12">
      <Suspense fallback={<p className="text-muted">Loading release…</p>}>
        <Editor params={params} />
      </Suspense>
    </Container>
  );
}

async function Editor({
  params,
}: {
  params: PageProps<"/dashboard/music/[id]">["params"];
}) {
  const { id } = await params;
  const [data, genres] = await Promise.all([
    getReleaseForEdit(id),
    getMusicGenres(),
  ]);
  if (!data) notFound();
  const { release, artist, cover, tracks, bundleItems, candidates } = data;
  const editable = ["draft", "rejected", "archived"].includes(release.status);
  const live = release.status === "published";
  const isBundle = release.release_type === "bundle";

  const checklist = [
    { label: "Cover artwork", done: Boolean(release.cover_asset_id) },
    { label: "Price", done: release.price_amount !== null },
    { label: "Genre", done: Boolean(release.genre_id) },
    isBundle
      ? {
          label: "At least two releases in the bundle",
          done: bundleItems.length >= 2,
        }
      : {
          label: "Tracks with audio and a preview",
          done:
            tracks.length > 0 &&
            tracks.every((track) => track.files.length && track.preview_path),
        },
  ];

  return (
    <>
      <AdminHeader
        title={release.title}
        eyebrow={`${RELEASE_TYPES[release.release_type]} · ${artist?.stage_name ?? ""}`}
        backHref="/dashboard/music"
        backLabel="My music"
      >
        <ReleaseStatusBadge status={release.status} />
        {live && artist ? (
          <Link
            href={`/music/${artist.slug}/${release.slug}`}
            className="text-sm underline underline-offset-4"
          >
            View in store
          </Link>
        ) : null}
      </AdminHeader>

      <div className="mt-6">
        <ReleaseStatusActions releaseId={release.id} status={release.status} />
      </div>

      {release.status === "rejected" && release.review_note ? (
        <div
          role="note"
          className="mt-6 rounded-(--radius) border border-danger/50 bg-danger/5 p-5"
        >
          <p className="font-medium text-danger">What to change</p>
          <p className="mt-2 whitespace-pre-line">{release.review_note}</p>
        </div>
      ) : null}
      {release.status === "in_review" ? (
        <p
          role="note"
          className="mt-6 rounded-(--radius) border border-uv/50 bg-uv/5 p-5"
        >
          We&apos;re reviewing this release and will notify you. To change
          something, withdraw it from review first.
        </p>
      ) : null}
      {artist && artist.status !== "published" ? (
        <p
          role="note"
          className="mt-6 rounded-(--radius) border border-line p-5 text-sm text-muted"
        >
          Your artist profile isn&apos;t public yet, so your music shows in the
          store once it is.
        </p>
      ) : null}

      <div className="mt-12 flex flex-col gap-16">
        {editable || live ? (
          <EditSection
            title="Details"
            description="Title, genre, tempo, price and the story behind it."
          >
            <ReleaseDetailsForm
              release={release}
              genres={genres}
              live={live}
              action={updateRelease.bind(null, release.id)}
            />
          </EditSection>
        ) : null}

        <EditSection
          title="Artwork"
          description="Square, at least 1400 × 1400 px. Your own or licensed artwork only."
        >
          <div className="flex flex-col gap-6">
            {cover ? (
              <div className="relative aspect-square w-48 overflow-hidden rounded-(--radius) bg-surface-2">
                <Image
                  src={cover.url}
                  alt={cover.alt}
                  fill
                  sizes="12rem"
                  className="object-cover"
                />
              </div>
            ) : (
              <p className="text-sm text-muted">No artwork yet.</p>
            )}
            {editable ? (
              <ImageUploader
                folder={mediaFolder("music", release.id)}
                register={registerReleaseCover.bind(null, release.id)}
                defaultAlt={`${release.title} artwork`}
              />
            ) : null}
          </div>
        </EditSection>

        {isBundle ? (
          <EditSection
            title="In this bundle"
            description="Pick at least two of your releases. Buyers get every track in them."
          >
            <BundlePicker
              releaseId={release.id}
              candidates={candidates}
              selected={bundleItems}
              editable={editable}
            />
          </EditSection>
        ) : (
          <EditSection
            title="Tracks"
            description="Upload masters in order. WAV or FLAC for best quality; add MP3 too if you like."
          >
            <div className="flex flex-col gap-6">
              <TrackRows
                releaseId={release.id}
                tracks={tracks}
                editable={editable}
                updateActions={Object.fromEntries(
                  tracks.map((track) => [
                    track.id,
                    updateTrack.bind(null, track.id),
                  ]),
                )}
              />
              {editable ? <TrackUploader releaseId={release.id} /> : null}
            </div>
          </EditSection>
        )}

        {editable ? (
          <EditSection
            title="Send for review"
            description="We listen to every release and check the rights before it goes live."
          >
            <SubmitForm
              action={submitRelease.bind(null, release.id)}
              checklist={checklist}
            />
          </EditSection>
        ) : null}
      </div>
    </>
  );
}
