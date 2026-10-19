import type { Metadata } from "next";
import { Suspense } from "react";
import {
  AdminHeader,
  AdminTable,
  StatusBadge,
} from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { countryName } from "@/lib/countries";
import { formatEventDate } from "@/lib/datetime";
import { listEventsForAdmin } from "@/modules/events/admin-queries";

export const metadata: Metadata = { title: "Events" };

export default function AdminEventsPage() {
  return (
    <Container className="py-12">
      <AdminHeader
        title="Events"
        action={{ href: "/admin/events/new", label: "New event" }}
      />
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <EventTable />
      </Suspense>
    </Container>
  );
}

async function EventTable() {
  const events = await listEventsForAdmin();
  return (
    <AdminTable
      columns={["Event", "Status", "Date", "Place"]}
      empty="No events yet."
      rows={events.map((event) => ({
        key: event.id,
        href: `/admin/events/${event.id}`,
        cells: [
          <>
            {event.title}
            {event.featured ? (
              <span className="ml-2 text-xs text-accent">★ Featured</span>
            ) : null}
          </>,
          <StatusBadge key="status" status={event.status} />,
          formatEventDate(event.starts_at, event.timezone),
          [event.city, countryName(event.country)].filter(Boolean).join(", ") ||
            "—",
        ],
      }))}
    />
  );
}
