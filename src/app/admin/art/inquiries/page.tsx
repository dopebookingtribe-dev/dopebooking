import type { Metadata } from "next";
import { Suspense } from "react";
import {
  AdminHeader,
  AdminTable,
  shortDate,
} from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { countryName } from "@/lib/countries";
import { listArtInquiries } from "@/modules/art/admin-queries";
import { ArtAdminNav } from "@/modules/art/components/admin/admin-shell";
import { SERVICE_STATUS_LABELS } from "@/modules/services/schemas";

export const metadata: Metadata = { title: "Collaboration inquiries" };

export default function ArtInquiriesPage() {
  return (
    <Container className="py-12">
      <AdminHeader title="Collaboration inquiries" eyebrow="Art Gallery" />
      <ArtAdminNav current="/admin/art/inquiries" />
      <p className="mt-8 max-w-[70ch] text-muted">
        Inquiries from festival organisers, curators and partners. Each one is a
        service request: open it to review, send a quote and talk with the
        requester. Updates reach them by email and in their dashboard.
      </p>
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <List />
      </Suspense>
    </Container>
  );
}

async function List() {
  const rows = await listArtInquiries();
  return (
    <AdminTable
      columns={[
        "Event or project",
        "Status",
        "Reference",
        "Place",
        "Starts",
        "Received",
      ]}
      empty="No collaboration inquiries yet."
      rows={rows.map((r) => {
        const preferred = (r.details as Record<string, unknown>)
          ?.preferred_artists;
        return {
          key: r.id,
          href: `/admin/services/${r.id}`,
          cells: [
            <>
              {r.event_name}
              {r.organisation ? (
                <span className="ml-2 text-sm text-muted">
                  {r.organisation}
                </span>
              ) : null}
              {typeof preferred === "string" && preferred ? (
                <span className="block text-xs text-accent">
                  Asked for: {preferred}
                </span>
              ) : null}
            </>,
            SERVICE_STATUS_LABELS[r.status],
            r.reference,
            [r.city, countryName(r.country)].filter(Boolean).join(", "),
            r.event_start,
            shortDate(r.created_at),
          ],
        };
      })}
    />
  );
}
