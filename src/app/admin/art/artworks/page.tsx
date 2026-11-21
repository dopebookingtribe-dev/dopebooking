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
  listArtworksForAdmin,
} from "@/modules/art/admin-queries";
import {
  ArtAdminNav,
  MigrationNotice,
} from "@/modules/art/components/admin/admin-shell";
import { DISCIPLINES, isDiscipline } from "@/modules/art/schemas";

export const metadata: Metadata = { title: "Art Gallery artworks" };

export default function ArtworksAdminPage() {
  return (
    <Container className="py-12">
      <AdminHeader
        title="Artworks"
        eyebrow="Art Gallery"
        action={{ href: "/admin/art/artworks/new", label: "New artwork" }}
      />
      <ArtAdminNav current="/admin/art/artworks" />
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <List />
      </Suspense>
    </Container>
  );
}

async function List() {
  if (!(await artTablesReady())) return <MigrationNotice />;
  const works = await listArtworksForAdmin();
  return (
    <AdminTable
      columns={["Artwork", "Status", "By", "Discipline", "Year", "Updated"]}
      empty="No artworks yet. Create one, credit its artists and add it to exhibitions."
      rows={works.map((w) => ({
        key: w.id,
        href: `/admin/art/artworks/${w.id}`,
        cells: [
          <>
            {w.title}
            {w.featured ? (
              <span className="ml-2 text-xs text-accent">★ Featured</span>
            ) : null}
            {!w.image_asset_id ? (
              <span className="ml-2 text-xs text-danger">No image</span>
            ) : null}
            {w.is_demo ? (
              <span className="ml-2 text-xs text-uv">Demo</span>
            ) : null}
          </>,
          <StatusBadge key="s" status={w.status} />,
          w.artists.join(" & ") || "—",
          w.discipline && isDiscipline(w.discipline)
            ? DISCIPLINES[w.discipline]
            : "—",
          w.year ?? "—",
          shortDate(w.updated_at),
        ],
      }))}
    />
  );
}
