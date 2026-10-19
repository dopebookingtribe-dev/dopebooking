import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { requireRole, STAFF_ROLES } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

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
        Signed in as {user.email} ({user.roles.join(", ")}). Artist, event and
        booking management arrives in Phase 03.
      </p>
    </>
  );
}
