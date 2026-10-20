import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader, AdminTable } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { listProviders } from "@/modules/services/queries";
import { SERVICE_LABELS } from "@/modules/services/schemas";

export const metadata: Metadata = { title: "Providers" };

export default function ProvidersPage() {
  return (
    <Container className="py-12">
      <AdminHeader
        title="Providers"
        backHref="/admin/services"
        backLabel="Service requests"
        action={{ href: "/admin/providers/new", label: "Add provider" }}
      />
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <Table />
      </Suspense>
    </Container>
  );
}

async function Table() {
  const providers = await listProviders();
  return (
    <AdminTable
      columns={["Provider", "Services", "Regions", "Status"]}
      empty="No providers yet. Add caterers, photographers and videographers you work with."
      rows={providers.map((provider) => ({
        key: provider.id,
        href: `/admin/providers/${provider.id}`,
        cells: [
          provider.name,
          provider.services.map((type) => SERVICE_LABELS[type]).join(", "),
          provider.regions ?? "—",
          provider.active ? "Active" : "Inactive",
        ],
      }))}
    />
  );
}
