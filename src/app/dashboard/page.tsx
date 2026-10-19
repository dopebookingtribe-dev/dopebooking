import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { requireUser, STAFF_ROLES } from "@/lib/auth/dal";
import { signOut } from "@/modules/auth/actions";

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
  const isStaff = user.roles.some((role) =>
    (STAFF_ROLES as readonly string[]).includes(role),
  );

  return (
    <>
      <h1 className="mt-3 font-display text-headline">Welcome back</h1>
      <p className="mt-4 text-muted">
        Signed in as <span className="text-text">{user.email}</span>
      </p>
      <p className="mt-2 text-sm text-muted">
        Roles: {user.roles.length ? user.roles.join(", ") : "none yet"}
      </p>
      <p className="mt-10 max-w-prose text-muted">
        Bookings, requests and orders will appear here as those features ship.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        {isStaff ? (
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center text-sm text-text underline underline-offset-4"
          >
            Open admin
          </Link>
        ) : null}
        <form action={signOut}>
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </div>
    </>
  );
}
