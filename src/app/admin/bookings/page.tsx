import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminHeader, AdminTable } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import type { BookingStatus } from "@/lib/supabase/database.types";
import { formatDay } from "@/modules/bookings/components/booking-summary";
import { BookingStatusBadge } from "@/modules/bookings/components/status-badge";
import { listBookingsForAdmin } from "@/modules/bookings/queries";
import { STATUS_LABELS } from "@/modules/bookings/schemas";

export const metadata: Metadata = { title: "Bookings" };

type Filter = BookingStatus | "open" | "all";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
  { key: "all", label: "All" },
];

function toFilter(value: unknown): Filter {
  if (value === "all" || value === "open") return value;
  return typeof value === "string" && value in STATUS_LABELS
    ? (value as BookingStatus)
    : "open";
}

export default function AdminBookingsPage({
  searchParams,
}: PageProps<"/admin/bookings">) {
  return (
    <Container className="py-12">
      <AdminHeader title="Bookings" />
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <Inbox searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Inbox({
  searchParams,
}: {
  searchParams: PageProps<"/admin/bookings">["searchParams"];
}) {
  const filter = toFilter((await searchParams).status);
  const bookings = await listBookingsForAdmin(filter);

  return (
    <>
      <nav aria-label="Filter bookings" className="mt-8">
        <ul className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <li key={item.key}>
              <Link
                href={`/admin/bookings?status=${item.key}`}
                aria-current={filter === item.key ? "page" : undefined}
                className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 text-sm text-muted hover:text-text aria-[current=page]:border-accent aria-[current=page]:text-accent"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <AdminTable
        columns={["Request", "Status", "Artist", "Event date", "Place"]}
        empty="No bookings here."
        rows={bookings.map((booking) => ({
          key: booking.id,
          href: `/admin/bookings/${booking.id}`,
          cells: [
            <>
              {booking.event_name}
              <span className="ml-2 font-label text-xs text-muted">
                {booking.reference}
              </span>
              {!booking.assigned_staff_id ? (
                <span className="ml-2 text-xs text-uv">Unassigned</span>
              ) : null}
            </>,
            <BookingStatusBadge key="status" status={booking.status} />,
            booking.artist?.name ?? "—",
            formatDay(booking.event_date),
            `${booking.city}, ${booking.country}`,
          ],
        }))}
      />
    </>
  );
}
