import type { Metadata } from "next";
import { Suspense } from "react";
import {
  AdminHeader,
  AdminTable,
  shortDate,
  StatusBadge,
} from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { listGalleriesForAdmin } from "@/modules/galleries/admin-queries";

export const metadata: Metadata = { title: "Galleries" };

export default function AdminGalleriesPage() {
  return (
    <Container className="py-12">
      <AdminHeader
        title="Galleries"
        action={{ href: "/admin/galleries/new", label: "New gallery" }}
      />
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <GalleryTable />
      </Suspense>
    </Container>
  );
}

async function GalleryTable() {
  const galleries = await listGalleriesForAdmin();
  return (
    <AdminTable
      columns={["Gallery", "Status", "Updated"]}
      empty="No galleries yet."
      rows={galleries.map((gallery) => ({
        key: gallery.id,
        href: `/admin/galleries/${gallery.id}`,
        cells: [
          gallery.title,
          <StatusBadge key="status" status={gallery.status} />,
          shortDate(gallery.updated_at),
        ],
      }))}
    />
  );
}
