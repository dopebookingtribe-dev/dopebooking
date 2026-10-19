import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { listArtistsForAdmin } from "@/modules/artists/admin-queries";
import { StatusBadge } from "@/components/admin/admin-ui";
import { GENRES, isGenre } from "@/modules/artists/schemas";

export const metadata: Metadata = { title: "Artists" };

export default function AdminArtistsPage() {
  return (
    <Container className="py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Meta>Admin</Meta>
          <h1 className="mt-3 font-display text-headline">Artists</h1>
        </div>
        <ButtonLink href="/admin/artists/new">New artist</ButtonLink>
      </div>
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <ArtistTable />
      </Suspense>
    </Container>
  );
}

async function ArtistTable() {
  const artists = await listArtistsForAdmin();
  if (!artists.length) {
    return (
      <p className="mt-10 text-muted">
        No artists yet. Create the first one to start the roster.
      </p>
    );
  }

  return (
    <div className="mt-10 overflow-x-auto rounded-(--radius) border border-line">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="bg-surface-1 font-mono text-xs tracking-[0.12em] text-muted uppercase">
          <tr>
            <th scope="col" className="px-4 py-3 font-normal">
              Artist
            </th>
            <th scope="col" className="px-4 py-3 font-normal">
              Status
            </th>
            <th scope="col" className="px-4 py-3 font-normal">
              Genres
            </th>
            <th scope="col" className="px-4 py-3 font-normal">
              Updated
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {artists.map((artist) => (
            <tr key={artist.id} className="hover:bg-surface-1">
              <td className="px-4 py-3">
                <Link
                  href={`/admin/artists/${artist.id}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {artist.stage_name}
                </Link>
                {artist.featured ? (
                  <span className="ml-2 text-xs text-accent">★ Featured</span>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={artist.status} />
              </td>
              <td className="px-4 py-3 text-muted">
                {artist.genres
                  .map((genre) => (isGenre(genre) ? GENRES[genre] : genre))
                  .join(", ") || "—"}
              </td>
              <td className="px-4 py-3 text-muted">
                {new Date(artist.updated_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
