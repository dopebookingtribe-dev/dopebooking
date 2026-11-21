import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { requirePermission } from "@/lib/auth/permissions";
import { createArtArtist } from "@/modules/art/actions";
import { CreateForm } from "@/modules/art/components/admin/create-form";

export const metadata: Metadata = { title: "New Art Gallery artist" };

export default function NewArtArtistPage() {
  return (
    <Container className="py-12">
      <AdminHeader
        title="New artist"
        eyebrow="Art Gallery"
        backHref="/admin/art/artists"
        backLabel="All artists"
      />
      <div className="mt-10">
        <Suspense fallback={<p className="text-muted">Checking access…</p>}>
          <Gate />
        </Suspense>
      </div>
    </Container>
  );
}

async function Gate() {
  await requirePermission("content.manage", "/admin/art/artists/new");
  return (
    <CreateForm
      action={createArtArtist}
      fields={[
        { name: "name", label: "Artistic name" },
        {
          name: "slug",
          label: "URL name (optional)",
          hint: "Made from the name if empty.",
        },
      ]}
      kinds
    />
  );
}
