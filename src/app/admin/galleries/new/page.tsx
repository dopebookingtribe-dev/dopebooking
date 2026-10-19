import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { SimpleCreateForm } from "@/components/ui/simple-create-form";
import { requireRole, STAFF_ROLES } from "@/lib/auth/dal";
import { createGallery } from "@/modules/galleries/actions";

export const metadata: Metadata = { title: "New gallery" };

export default function NewGalleryPage() {
  return (
    <Container className="py-12">
      <AdminHeader
        title="New gallery"
        backHref="/admin/galleries"
        backLabel="All galleries"
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
  await requireRole(STAFF_ROLES, "/admin/galleries/new");
  return (
    <SimpleCreateForm
      action={createGallery}
      fields={[
        {
          name: "title",
          label: "Gallery name",
          hint: "e.g. “Ozora 2026 — Day 1”",
        },
      ]}
    />
  );
}
