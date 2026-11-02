import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  AdminHeader,
  EditSection,
  shortDate,
} from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { requirePermission } from "@/lib/auth/permissions";
import { formatCents } from "@/modules/marketplace/schemas";
import {
  reviewRelease,
  saveReleaseCuration,
} from "@/modules/music/admin-actions";
import { getReleaseForReview } from "@/modules/music/admin-queries";
import {
  CurationForm,
  ReviewForm,
} from "@/modules/music/components/admin-forms";
import { ReleaseStatusBadge } from "@/modules/music/components/music-badges";
import {
  FILE_FORMATS,
  formatDuration,
  MUSIC_CURRENCY,
  RELEASE_TYPES,
} from "@/modules/music/schemas";

export const metadata: Metadata = { title: "Review release" };

export default function ReviewReleasePage({
  params,
}: PageProps<"/admin/music/[id]">) {
  return (
    <Container className="py-12">
      <Suspense fallback={<p className="text-muted">Loading release…</p>}>
        <Review params={params} />
      </Suspense>
    </Container>
  );
}

async function Review({
  params,
}: {
  params: PageProps<"/admin/music/[id]">["params"];
}) {
  const { id } = await params;
  await requirePermission("music.manage", `/admin/music/${id}`);
  const data = await getReleaseForReview(id);
  if (!data) notFound();
  const { release, artist, cover, tracks, bundleReleases, sales } = data;
  const money = (cents: number) => formatCents(cents, MUSIC_CURRENCY);

  const facts: [string, string | null][] = [
    ["Type", RELEASE_TYPES[release.release_type]],
    ["Genre", [data.genre, data.subgenre].filter(Boolean).join(" › ") || null],
    [
      "Price",
      release.price_amount !== null ? money(release.price_amount) : null,
    ],
    ["For sale", release.on_sale ? "Yes" : "No"],
    ["BPM", release.bpm ? String(release.bpm) : null],
    ["Key", release.musical_key],
    ["Release date", release.release_date],
    ["Label", release.label],
    ["Catalogue", release.catalog_number],
    [
      "Rights confirmed",
      release.rights_confirmed_at
        ? shortDate(release.rights_confirmed_at)
        : null,
    ],
    [
      "Sent for review",
      release.submitted_at ? shortDate(release.submitted_at) : null,
    ],
    [
      "Sold",
      sales.count
        ? `${sales.count} (${money(sales.gross)}, commission ${money(sales.commission)})`
        : "0",
    ],
  ];

  return (
    <>
      <AdminHeader
        title={release.title}
        eyebrow={`Music · ${artist?.stage_name ?? ""}`}
        backHref="/admin/music"
        backLabel="Music"
      >
        <ReleaseStatusBadge status={release.status} />
        {release.status === "published" && artist ? (
          <Link
            href={`/music/${artist.slug}/${release.slug}`}
            className="text-sm underline underline-offset-4"
          >
            View in store
          </Link>
        ) : null}
      </AdminHeader>

      <div className="mt-12 flex flex-col gap-16">
        <EditSection title="Release" description="What the artist submitted.">
          <div className="grid gap-8 md:grid-cols-[12rem_1fr]">
            <div className="relative aspect-square w-48 overflow-hidden rounded-(--radius) bg-surface-2">
              {cover ? (
                <Image
                  src={cover.url}
                  alt={cover.alt}
                  fill
                  sizes="12rem"
                  className="object-cover"
                />
              ) : null}
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="font-label text-xs text-muted">{label}</dt>
                  <dd>{value ?? "—"}</dd>
                </div>
              ))}
            </dl>
          </div>
          {release.description ? (
            <p className="mt-6 text-sm whitespace-pre-line text-muted">
              {release.description}
            </p>
          ) : null}
          {release.credits ? (
            <p className="mt-4 text-sm whitespace-pre-line text-muted">
              <span className="text-text">Credits: </span>
              {release.credits}
            </p>
          ) : null}
          {artist && artist.status !== "published" ? (
            <p className="mt-6 text-sm text-danger">
              The artist profile isn&apos;t published, so this release stays
              hidden even when approved.
            </p>
          ) : null}
        </EditSection>

        {release.release_type === "bundle" ? (
          <EditSection title="Bundle" description="Releases included.">
            <ul className="flex flex-col gap-2 text-sm">
              {bundleReleases.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/admin/music/${item.id}`}
                    className="underline underline-offset-4"
                  >
                    {item.title}
                  </Link>{" "}
                  <ReleaseStatusBadge status={item.status} />
                </li>
              ))}
            </ul>
          </EditSection>
        ) : (
          <EditSection
            title="Tracks"
            description="Listen to the preview and spot-check the masters buyers will get."
          >
            <ol className="flex flex-col gap-4">
              {tracks.map((track) => (
                <li
                  key={track.id}
                  className="rounded-(--radius) border border-line bg-surface-1 p-4"
                >
                  <p className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">
                      {String(track.position).padStart(2, "0")} {track.title}
                    </span>
                    <span className="font-label text-xs text-muted">
                      {[
                        formatDuration(track.duration_seconds),
                        track.bpm ? `${track.bpm} BPM` : null,
                        track.musical_key,
                        track.isrc,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </p>
                  {track.previewUrl ? (
                    <div className="mt-3">
                      <p className="font-label text-xs text-muted">
                        Public preview
                      </p>
                      <audio
                        controls
                        preload="none"
                        src={track.previewUrl}
                        className="mt-1 h-9 w-full max-w-md"
                      />
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-danger">No preview.</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-3">
                    {track.files.map((file) =>
                      file.url ? (
                        <a
                          key={file.id}
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-accent underline underline-offset-4"
                        >
                          Master {FILE_FORMATS[file.format].label} (
                          {(file.size_bytes / 1024 / 1024).toFixed(1)} MB)
                        </a>
                      ) : null,
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </EditSection>
        )}

        {["in_review", "published"].includes(release.status) ? (
          <EditSection
            title="Decision"
            description="Check sound, artwork and rights. The artist is notified either way."
          >
            <ReviewForm
              action={reviewRelease.bind(null, release.id)}
              status={release.status}
            />
          </EditSection>
        ) : (
          <EditSection
            title="Decision"
            description="Nothing to decide right now."
          >
            <p className="text-sm text-muted">
              {release.status === "rejected" && release.review_note
                ? `Sent back: ${release.review_note}`
                : "The artist is still working on this release."}
            </p>
          </EditSection>
        )}

        <EditSection
          title="Featuring"
          description="Featured releases lead the music store; lower order shows first."
        >
          <CurationForm
            action={saveReleaseCuration.bind(null, release.id)}
            featured={release.featured}
            sortOrder={release.sort_order}
          />
        </EditSection>
      </div>
    </>
  );
}
