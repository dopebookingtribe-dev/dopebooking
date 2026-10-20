import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { requireUser, STAFF_ROLES } from "@/lib/auth/dal";
import { signOut } from "@/modules/auth/actions";
import {
  countUnreadNotifications,
  listMyBookings,
} from "@/modules/bookings/queries";
import { OPEN_STATUSES } from "@/modules/bookings/schemas";
import { listMyServiceRequests } from "@/modules/services/queries";
import { SERVICE_OPEN_STATUSES } from "@/modules/services/schemas";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <Container className="py-16">
      <Meta>Dashboard</Meta>
      <Suspense
        fallback={<p className="mt-6 text-muted">Loading your account…</p>}
      >
        <Overview />
      </Suspense>
    </Container>
  );
}

async function Overview() {
  const user = await requireUser("/dashboard");
  const [bookings, requests, unread] = await Promise.all([
    listMyBookings(),
    listMyServiceRequests(),
    countUnreadNotifications(user.id),
  ]);
  const openRequests = requests.filter((request) =>
    SERVICE_OPEN_STATUSES.includes(request.status),
  ).length;
  const open = bookings.filter((booking) =>
    OPEN_STATUSES.includes(booking.status),
  ).length;
  const isStaff = user.roles.some((role) =>
    (STAFF_ROLES as readonly string[]).includes(role),
  );

  const tiles = [
    {
      href: "/dashboard/bookings",
      title: "Booking requests",
      body: bookings.length
        ? `${open} open · ${bookings.length} total`
        : "No requests yet",
    },
    {
      href: "/dashboard/requests",
      title: "Service requests",
      body: requests.length
        ? `${openRequests} open · ${requests.length} total`
        : "Promotion, catering, production",
    },
    {
      href: "/dashboard/notifications",
      title: "Notifications",
      body: unread ? `${unread} unread` : "All caught up",
    },
    ...(isStaff
      ? [
          {
            href: "/admin",
            title: "Admin",
            body: "Roster, events, media and bookings",
          },
        ]
      : []),
  ];

  return (
    <>
      <h1 className="mt-3 font-display text-headline">Welcome back</h1>
      <p className="mt-4 text-muted">
        Signed in as <span className="text-text">{user.email}</span>
      </p>
      <ul className="mt-10 grid gap-px overflow-hidden rounded-(--radius) border border-line bg-line sm:grid-cols-2">
        {tiles.map((tile) => (
          <li key={tile.href} className="bg-bg">
            <Link
              href={tile.href}
              className="block p-6 transition-colors hover:bg-surface-1"
            >
              <span className="font-display text-3xl">{tile.title}</span>
              <span className="mt-2 block text-sm text-muted">{tile.body}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink href="/artists">Book an artist</ButtonLink>
        <form action={signOut}>
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </div>
    </>
  );
}
