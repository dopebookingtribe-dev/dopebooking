import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminHeader, EditSection } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { COUNTRIES } from "@/lib/countries";
import { deleteFestival, saveFestival } from "@/modules/art/actions";
import { getFestivalForAdmin } from "@/modules/art/admin-queries";
import {
  DeleteItemForm,
  FestivalForm,
} from "@/modules/art/components/admin/forms";

export const metadata: Metadata = { title: "Edit festival" };

export default function EditFestivalPage({
  params,
}: PageProps<"/admin/art/festivals/[id]">) {
  return (
    <Container className="py-12">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Editor params={params} />
      </Suspense>
    </Container>
  );
}

async function Editor({
  params,
}: {
  params: PageProps<"/admin/art/festivals/[id]">["params"];
}) {
  const { id } = await params;
  const festival = await getFestivalForAdmin(id);
  if (!festival) notFound();
  return (
    <>
      <AdminHeader
        title={festival.name}
        eyebrow="Edit festival"
        backHref="/admin/art/festivals"
        backLabel="All festivals"
      />
      <div className="mt-12 flex flex-col gap-16">
        <EditSection
          title="Details"
          description="Shown on exhibition pages and in “Where we have exhibited”."
        >
          <FestivalForm
            festival={festival}
            action={saveFestival.bind(null, festival.id)}
            countries={COUNTRIES}
          />
        </EditSection>
        <EditSection
          title="Delete"
          description="Exhibitions keep their data; they just lose the festival link."
        >
          <DeleteItemForm
            label={festival.name}
            action={deleteFestival.bind(null, festival.id)}
          />
        </EditSection>
      </div>
    </>
  );
}
