import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { requireRole, STAFF_ROLES } from "@/lib/auth/dal";
import { CreateArtistForm } from "@/modules/artists/components/admin/create-artist-form";

export const metadata: Metadata = { title: "New artist" };

export default function NewArtistPage() {
  return (
    <Container className="py-12">
      <Link
        href="/admin/artists"
        className="text-sm text-muted hover:text-text"
      >
        ← All artists
      </Link>
      <h1 className="mt-8 mb-10 font-display text-headline">New artist</h1>
      <Suspense fallback={<p className="text-muted">Checking access…</p>}>
        <Gate />
      </Suspense>
    </Container>
  );
}

async function Gate() {
  await requireRole(STAFF_ROLES, "/admin/artists/new");
  return <CreateArtistForm />;
}
