import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { requirePermission } from "@/lib/auth/permissions";
import { createArtExhibition } from "@/modules/art/actions";
import { CreateForm } from "@/modules/art/components/admin/create-form";

export const metadata: Metadata = { title: "New exhibition" };

export default function NewArtExhibitionPage() {
  return (
    <Container className="py-12">
      <AdminHeader
        title="New exhibition"
        eyebrow="Art Gallery"
        backHref="/admin/art/exhibitions"
        backLabel="All exhibitions"
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
  await requirePermission("content.manage", "/admin/art/exhibitions/new");
  return (
    <CreateForm
      action={createArtExhibition}
      fields={[
        { name: "title", label: "Exhibition title" },
        {
          name: "slug",
          label: "URL name (optional)",
          hint: "Made from the title if empty.",
        },
      ]}
    />
  );
}
