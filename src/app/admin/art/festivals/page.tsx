import type { Metadata } from "next";
import { Suspense } from "react";
import {
  AdminHeader,
  AdminTable,
  EditSection,
} from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { COUNTRIES, countryName } from "@/lib/countries";
import { saveFestival } from "@/modules/art/actions";
import {
  artTablesReady,
  listFestivalsForAdmin,
} from "@/modules/art/admin-queries";
import {
  ArtAdminNav,
  MigrationNotice,
} from "@/modules/art/components/admin/admin-shell";
import { FestivalForm } from "@/modules/art/components/admin/forms";

export const metadata: Metadata = { title: "Art Gallery festivals" };

export default function FestivalsAdminPage() {
  return (
    <Container className="py-12">
      <AdminHeader title="Festivals" eyebrow="Art Gallery" />
      <ArtAdminNav current="/admin/art/festivals" />
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <List />
      </Suspense>
    </Container>
  );
}

async function List() {
  if (!(await artTablesReady())) return <MigrationNotice />;
  const festivals = await listFestivalsForAdmin();
  return (
    <>
      <p className="mt-8 max-w-[70ch] text-muted">
        Festivals group exhibitions (for example, several editions of the same
        festival). They are shown publicly only through published exhibitions.
      </p>
      <AdminTable
        columns={["Festival", "Place", "Exhibitions"]}
        empty="No festivals yet."
        rows={festivals.map((f) => ({
          key: f.id,
          href: `/admin/art/festivals/${f.id}`,
          cells: [
            <>
              {f.name}
              {f.is_demo ? (
                <span className="ml-2 text-xs text-uv">Demo</span>
              ) : null}
            </>,
            [f.city, countryName(f.country)].filter(Boolean).join(", ") || "—",
            String(f.exhibitions),
          ],
        }))}
      />
      <div className="mt-16">
        <EditSection
          title="Add a festival"
          description="Name, place and website."
        >
          <FestivalForm
            festival={null}
            action={saveFestival.bind(null, null)}
            countries={COUNTRIES}
          />
        </EditSection>
      </div>
    </>
  );
}
