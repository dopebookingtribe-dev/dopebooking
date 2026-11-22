import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { SimpleCreateForm } from "@/components/ui/simple-create-form";
import { requirePermission } from "@/lib/auth/permissions";
import { createPost } from "@/modules/posts/actions";

export const metadata: Metadata = { title: "New post" };

export default function NewPostPage() {
  return (
    <Container className="py-12">
      <AdminHeader
        title="New post"
        backHref="/admin/posts"
        backLabel="All news"
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
  await requirePermission("content.manage", "/admin/posts/new");
  return (
    <SimpleCreateForm
      action={createPost}
      fields={[
        {
          name: "title",
          label: "Title",
          hint: "You add the text, cover and photos next.",
        },
      ]}
    />
  );
}
