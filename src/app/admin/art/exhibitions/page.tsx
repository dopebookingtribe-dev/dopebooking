import type { Metadata } from "next";
import { Suspense } from "react";
import {
  AdminHeader,
  AdminTable,
  StatusBadge,
} from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import {
  artTablesReady,
  listArtExhibitionsForAdmin,
  listFestivalsForAdmin,
} from "@/modules/art/admin-queries";
import {
  ArtAdminNav,
  MigrationNotice,
} from "@/modules/art/components/admin/admin-shell";
import {
  exhibitionTiming,
  formatDateRange,
  TIMING_LABELS,
} from "@/modules/art/schemas";

export const metadata: Metadata = { title: "Art Gallery exhibitions" };

export default function ArtExhibitionsAdminPage() {
  return (
    <Container className="py-12">
      <AdminHeader
        title="Exhibitions"
        eyebrow="Art Gallery"
        action={{ href: "/admin/art/exhibitions/new", label: "New exhibition" }}
      />
      <ArtAdminNav current="/admin/art/exhibitions" />
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <List />
      </Suspense>
    </Container>
  );
}

async function List() {
  if (!(await artTablesReady())) return <MigrationNotice />;
  const [exhibitions, festivals] = await Promise.all([
    listArtExhibitionsForAdmin(),
    listFestivalsForAdmin(),
  ]);
  const festivalName = new Map(festivals.map((f) => [f.id, f.name]));
  return (
    <AdminTable
      columns={["Exhibition", "Status", "When", "Festival", "Dates"]}
      empty="No exhibitions yet. Create one, then add its artists, works and photos."
      rows={exhibitions.map((e) => ({
        key: e.id,
        href: `/admin/art/exhibitions/${e.id}`,
        cells: [
          <>
            {e.title}
            {e.featured ? (
              <span className="ml-2 text-xs text-accent">★ Featured</span>
            ) : null}
            {e.is_demo ? (
              <span className="ml-2 text-xs text-uv">Demo</span>
            ) : null}
          </>,
          <StatusBadge key="s" status={e.status} />,
          TIMING_LABELS[exhibitionTiming(e.starts_on, e.ends_on)],
          (e.festival_id && festivalName.get(e.festival_id)) || "—",
          formatDateRange(e.starts_on, e.ends_on),
        ],
      }))}
    />
  );
}
