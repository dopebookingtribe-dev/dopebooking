import Link from "next/link";
import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { requireRole, STAFF_ROLES } from "@/lib/auth/dal";

const SECTIONS = [
  {
    href: "/admin/bookings",
    title: "Bookings",
    body: "Requests, quotes and conversations.",
  },
  {
    href: "/admin/artists",
    title: "Artists",
    body: "Roster, profiles, photos and links.",
  },
  {
    href: "/admin/events",
    title: "Events",
    body: "Dates, venues, lineups and covers.",
  },
  {
    href: "/admin/galleries",
    title: "Galleries",
    body: "Festival photo sets, bulk upload.",
  },
  {
    href: "/admin/videos",
    title: "Videos",
    body: "Aftermovies and sets from any video link.",
  },
] as const;

export default function AdminPage() {
  return (
    <Container className="py-16">
      <Suspense fallback={<p className="text-muted">Checking access…</p>}>
        <AdminHome />
      </Suspense>
    </Container>
  );
}

async function AdminHome() {
  // Non-staff users get a 404, so the admin area isn't advertised.
  const user = await requireRole(STAFF_ROLES, "/admin");

  return (
    <>
      <Meta>Admin</Meta>
      <h1 className="mt-3 font-display text-headline">Control room</h1>
      <p className="mt-4 text-muted">
        Signed in as {user.email} ({user.roles.join(", ")}).
      </p>
      <ul className="mt-10 grid gap-px overflow-hidden rounded-(--radius) border border-line bg-line sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <li key={section.href} className="bg-bg">
            <Link
              href={section.href}
              className="block p-6 transition-colors hover:bg-surface-1"
            >
              <span className="font-display text-3xl">{section.title}</span>
              <span className="mt-2 block text-sm text-muted">
                {section.body}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
