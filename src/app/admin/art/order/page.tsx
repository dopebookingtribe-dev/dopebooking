import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader, EditSection } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { saveFeaturedOrder } from "@/modules/art/actions";
import { artTablesReady, getFeaturedOrder } from "@/modules/art/admin-queries";
import {
  ArtAdminNav,
  MigrationNotice,
} from "@/modules/art/components/admin/admin-shell";
import { OrderedPickerForm } from "@/modules/art/components/admin/forms";

export const metadata: Metadata = { title: "Featured order" };

export default function FeaturedOrderPage() {
  return (
    <Container className="py-12">
      <AdminHeader title="Featured order" eyebrow="Art Gallery" />
      <ArtAdminNav current="/admin/art/order" />
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <Lists />
      </Suspense>
    </Container>
  );
}

async function Lists() {
  if (!(await artTablesReady())) return <MigrationNotice />;
  const { artists, exhibitions, works } = await getFeaturedOrder();
  const option = (row: { id: string; label: string; status: string }) => ({
    id: row.id,
    label: row.label,
    hint: row.status !== "published" ? row.status : undefined,
  });
  return (
    <div className="mt-12 flex flex-col gap-16">
      <p className="max-w-[70ch] text-muted">
        Featured items come first on the Art Gallery pages, in this order. Mark
        items as featured on their own pages; use the arrows here to arrange
        them.
      </p>
      <EditSection
        title="Exhibitions"
        description="The first one becomes the large feature card on the landing page (exhibitions on view always lead)."
      >
        <OrderedPickerForm
          name="id"
          selected={exhibitions.map((e) => e.id)}
          options={exhibitions.map(option)}
          action={saveFeaturedOrder.bind(null, "exhibition")}
          addLabel=""
          saveLabel="Save order"
          emptyText="No featured exhibitions."
          allowAdd={false}
        />
      </EditSection>
      <EditSection
        title="Artists"
        description="Meet the artists and the artist directory."
      >
        <OrderedPickerForm
          name="id"
          selected={artists.map((a) => a.id)}
          options={artists.map(option)}
          action={saveFeaturedOrder.bind(null, "artist")}
          addLabel=""
          saveLabel="Save order"
          emptyText="No featured artists."
          allowAdd={false}
        />
      </EditSection>
      <EditSection
        title="Artworks"
        description="The hero wall hangs featured works first."
      >
        <OrderedPickerForm
          name="id"
          selected={works.map((w) => w.id)}
          options={works.map(option)}
          action={saveFeaturedOrder.bind(null, "artwork")}
          addLabel=""
          saveLabel="Save order"
          emptyText="No featured artworks."
          allowAdd={false}
        />
      </EditSection>
    </div>
  );
}
