import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { requireUser } from "@/lib/auth/dal";
import { createRelease } from "@/modules/music/actions";
import { CreateReleaseForm } from "@/modules/music/components/release-forms";
import { getMyArtists } from "@/modules/music/queries";

export const metadata: Metadata = { title: "New release" };

export default function NewReleasePage() {
  return (
    <Container className="py-12">
      <AdminHeader
        title="New release"
        eyebrow="My music"
        backHref="/dashboard/music"
        backLabel="My music"
      />
      <div className="mt-10">
        <Suspense fallback={<p className="text-muted">Loading…</p>}>
          <Form />
        </Suspense>
      </div>
    </Container>
  );
}

async function Form() {
  const user = await requireUser("/dashboard/music/new");
  const artists = await getMyArtists(user.id);
  if (!artists.length) {
    return (
      <p className="text-muted">
        Your account isn&apos;t linked to an artist yet. Ask your DopeBooking
        contact to link it.
      </p>
    );
  }
  return <CreateReleaseForm artists={artists} action={createRelease} />;
}
