import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { requireRole, STAFF_ROLES } from "@/lib/auth/dal";
import { saveProvider } from "@/modules/services/actions";
import { ProviderForm } from "@/modules/services/components/provider-form";

export const metadata: Metadata = { title: "Add provider" };

export default function NewProviderPage() {
  return (
    <Container className="py-12">
      <AdminHeader
        title="Add provider"
        backHref="/admin/providers"
        backLabel="All providers"
      />
      <div className="mt-10 max-w-3xl">
        <Suspense fallback={<p className="text-muted">Checking access…</p>}>
          <Gate />
        </Suspense>
      </div>
    </Container>
  );
}

async function Gate() {
  await requireRole(STAFF_ROLES, "/admin/providers/new");
  return (
    <ProviderForm provider={null} action={saveProvider.bind(null, null)} />
  );
}
