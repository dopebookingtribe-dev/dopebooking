import type { Metadata } from "next";
import { Suspense } from "react";
import {
  AdminHeader,
  AdminTable,
  shortDate,
  StatusBadge,
} from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import {
  artTablesReady,
  listArtArtistsForAdmin,
} from "@/modules/art/admin-queries";
import {
  ArtAdminNav,
  MigrationNotice,
} from "@/modules/art/components/admin/admin-shell";
import { ARTIST_KINDS, disciplineLabels } from "@/modules/art/schemas";

export const metadata: Metadata = { title: "Art Gallery artists" };

export default function ArtArtistsAdminPage() {
  return (
    <Container className="py-12">
      <AdminHeader
        title="Artists"
        eyebrow="Art Gallery"
        action={{ href: "/admin/art/artists/new", label: "New artist" }}
      />
      <ArtAdminNav current="/admin/art/artists" />
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <List />
      </Suspense>
    </Container>
  );
}

async function List() {
  if (!(await artTablesReady())) return <MigrationNotice />;
  const artists = await listArtArtistsForAdmin();
  return (
    <AdminTable
      columns={["Artist", "Status", "Type", "Disciplines", "Updated"]}
      empty="No artists yet. Create the first profile; it can be linked to any number of exhibitions and artworks."
      rows={artists.map((artist) => ({
        key: artist.id,
        href: `/admin/art/artists/${artist.id}`,
        cells: [
          <>
            {artist.name}
            {artist.featured ? (
              <span className="ml-2 text-xs text-accent">★ Featured</span>
            ) : null}
            {artist.is_demo ? (
              <span className="ml-2 text-xs text-uv">Demo</span>
            ) : null}
          </>,
          <StatusBadge key="s" status={artist.status} />,
          ARTIST_KINDS[artist.kind],
          disciplineLabels(artist.disciplines).join(", ") || "—",
          shortDate(artist.updated_at),
        ],
      }))}
    />
  );
}
