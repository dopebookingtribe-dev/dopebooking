import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { requirePermission } from "@/lib/auth/permissions";
import { createArtwork } from "@/modules/art/actions";
import { CreateForm } from "@/modules/art/components/admin/create-form";

export const metadata: Metadata = { title: "New artwork" };

export default function NewArtworkPage({
  searchParams,
}: PageProps<"/admin/art/artworks/new">) {
  return (
    <Container className="py-12">
      <AdminHeader
        title="New artwork"
        eyebrow="Art Gallery"
        backHref="/admin/art/artworks"
        backLabel="All artworks"
      />
      <div className="mt-10">
        <Suspense fallback={<p className="text-muted">Checking access…</p>}>
          <Gate searchParams={searchParams} />
        </Suspense>
      </div>
    </Container>
  );
}

async function Gate({
  searchParams,
}: {
  searchParams: PageProps<"/admin/art/artworks/new">["searchParams"];
}) {
  await requirePermission("content.manage", "/admin/art/artworks/new");
  const { artist } = await searchParams;
  return (
    <CreateForm
      action={createArtwork}
      fields={[
        { name: "title", label: "Artwork title" },
        {
          name: "slug",
          label: "URL name (optional)",
          hint: "Made from the title if empty.",
        },
      ]}
      hidden={typeof artist === "string" ? { artist_id: artist } : {}}
    />
  );
}
