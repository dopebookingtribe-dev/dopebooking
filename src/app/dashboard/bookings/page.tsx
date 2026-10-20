import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { formatDay } from "@/modules/bookings/components/booking-summary";
import { BookingStatusBadge } from "@/modules/bookings/components/status-badge";
import { listMyBookings } from "@/modules/bookings/queries";

export const metadata: Metadata = { title: "My booking requests" };

export default function MyBookingsPage() {
  return (
    <Container className="py-16">
      <Meta>Dashboard</Meta>
      <h1 className="mt-3 font-display text-headline">Booking requests</h1>
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <List />
      </Suspense>
    </Container>
  );
}

async function List() {
  const bookings = await listMyBookings();
  if (!bookings.length) {
    return (
      <div className="mt-10">
        <p className="text-muted">You haven&apos;t requested an artist yet.</p>
        <ButtonLink href="/artists" className="mt-6">
          Browse artists
        </ButtonLink>
      </div>
    );
  }
  return (
    <ul className="mt-10 divide-y divide-line border-y border-line">
      {bookings.map((booking) => (
        <li key={booking.id}>
          <Link
            href={`/dashboard/bookings/${booking.id}`}
            className="group grid gap-2 py-5 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6"
          >
            <div>
              <p className="font-display text-3xl transition-colors group-hover:text-accent">
                {booking.artist?.name ?? "Artist"}
              </p>
              <p className="mt-1 text-sm text-muted">
                {booking.event_name} · {booking.city} ·{" "}
                {formatDay(booking.event_date)}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-xs text-muted">
                {booking.reference}
              </span>
              <BookingStatusBadge status={booking.status} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
