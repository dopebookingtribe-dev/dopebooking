import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { SimpleCreateForm } from "@/components/ui/simple-create-form";
import { requireRole, STAFF_ROLES } from "@/lib/auth/dal";
import { createVideo } from "@/modules/videos/actions";

export const metadata: Metadata = { title: "Add video" };

export default function NewVideoPage() {
  return (
    <Container className="py-12">
      <AdminHeader
        title="Add video"
        backHref="/admin/videos"
        backLabel="All videos"
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
  await requireRole(STAFF_ROLES, "/admin/videos/new");
  return (
    <SimpleCreateForm
      action={createVideo}
      fields={[
        {
          name: "title",
          label: "Title",
          hint: "e.g. “Boom 2026 — Official Aftermovie”",
        },
        {
          name: "url",
          label: "Video link",
          type: "url",
          hint: "Paste a Mux, Cloudflare Stream, YouTube or Vimeo link.",
        },
      ]}
    />
  );
}
