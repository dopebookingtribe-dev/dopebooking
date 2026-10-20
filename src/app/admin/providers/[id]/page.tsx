import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { saveProvider } from "@/modules/services/actions";
import { ProviderForm } from "@/modules/services/components/provider-form";
import { getProvider } from "@/modules/services/queries";

export const metadata: Metadata = { title: "Provider" };

export default function ProviderPage({
  params,
}: PageProps<"/admin/providers/[id]">) {
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
  params: PageProps<"/admin/providers/[id]">["params"];
}) {
  const { id } = await params;
  const provider = await getProvider(id);
  if (!provider) notFound();
  return (
    <>
      <AdminHeader
        title={provider.name}
        eyebrow="Provider"
        backHref="/admin/providers"
        backLabel="All providers"
      />
      <div className="mt-10 max-w-3xl">
        <ProviderForm
          provider={provider}
          action={saveProvider.bind(null, provider.id)}
        />
      </div>
    </>
  );
}
