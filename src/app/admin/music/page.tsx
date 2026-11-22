import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminHeader, shortDate } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { Picture } from "@/components/ui/picture";
import { requirePermission } from "@/lib/auth/permissions";
import type { MusicReleaseStatus } from "@/lib/supabase/database.types";
import { FilterLink } from "@/modules/artists/components/artist-directory";
import { formatCents } from "@/modules/marketplace/schemas";
import {
  countReleasesInReview,
  listReleasesForAdmin,
} from "@/modules/music/admin-queries";
import { MusicAdminNav } from "@/modules/music/components/music-admin-nav";
import { ReleaseStatusBadge } from "@/modules/music/components/music-badges";
import {
  MUSIC_CURRENCY,
  RELEASE_STATUSES,
  RELEASE_TYPES,
} from "@/modules/music/schemas";

export const metadata: Metadata = { title: "Music" };

export default function MusicAdminPage({
  searchParams,
}: PageProps<"/admin/music">) {
  return (
    <Container className="py-16">
      <AdminHeader
        title="Music"
        action={{ href: "/admin/music/new", label: "New release" }}
      />
      <MusicAdminNav current="/admin/music" />
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <Releases searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Releases({
  searchParams,
}: {
  searchParams: PageProps<"/admin/music">["searchParams"];
}) {
  await requirePermission("music.manage", "/admin/music");
  const [params, inReview] = await Promise.all([
    searchParams,
    countReleasesInReview(),
  ]);
  const requested =
    typeof params.status === "string" ? params.status : undefined;
  const status =
    requested === "all"
      ? undefined
      : requested && requested in RELEASE_STATUSES
        ? (requested as MusicReleaseStatus)
        : inReview
          ? "in_review"
          : undefined;
  const releases = await listReleasesForAdmin(status);

  return (
    <>
      <ul className="mt-8 flex flex-wrap gap-2">
        <li>
          <FilterLink href="/admin/music?status=all" active={!status}>
            All
          </FilterLink>
        </li>
        {Object.entries(RELEASE_STATUSES).map(([key, label]) => (
          <li key={key}>
            <FilterLink
              href={`/admin/music?status=${key}`}
              active={status === key}
            >
              {label}
              {key === "in_review" && inReview ? (
                <span className="ml-2 rounded-full bg-accent px-1.5 font-label text-xs text-accent-ink">
                  {inReview}
                </span>
              ) : null}
            </FilterLink>
          </li>
        ))}
      </ul>
      {releases.length ? (
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {releases.map((release) => (
            <li key={release.id}>
              <Link
                href={`/admin/music/${release.id}`}
                className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-4 py-3 hover:bg-surface-1 sm:grid-cols-[3.5rem_minmax(0,1fr)_8rem_6rem_7rem]"
              >
                <span className="relative size-14 overflow-hidden rounded-lg bg-surface-2">
                  {release.cover ? (
                    <Picture image={release.cover} decorative sizes="3.5rem" />
                  ) : null}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {release.title}
                    {release.featured ? (
                      <span className="ml-2 text-accent">★</span>
                    ) : null}
                  </span>
                  <span className="block truncate text-sm text-muted">
                    {release.artist?.stage_name ?? "Artist"} ·{" "}
                    {RELEASE_TYPES[release.release_type]}
                  </span>
                </span>
                <span>
                  <ReleaseStatusBadge status={release.status} />
                </span>
                <span className="hidden font-label text-sm sm:block">
                  {release.price_amount !== null
                    ? formatCents(release.price_amount, MUSIC_CURRENCY)
                    : "—"}
                </span>
                <span className="hidden text-right text-sm text-muted sm:block">
                  {release.status === "in_review" && release.submitted_at
                    ? `Sent ${shortDate(release.submitted_at)}`
                    : shortDate(release.updated_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-10 text-muted">
          {status === "in_review"
            ? "Nothing waiting for review."
            : "No releases here yet."}
        </p>
      )}
    </>
  );
}
