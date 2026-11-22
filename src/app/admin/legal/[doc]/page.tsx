import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { currentPermissions } from "@/lib/auth/permissions";
import { LegalEditor } from "@/modules/legal/components/legal-editor";
import { isLegalDoc, LEGAL_DOCS } from "@/modules/legal/docs";
import { getLegalForEdit } from "@/modules/legal/queries";

export const metadata: Metadata = { title: "Edit legal page" };

export default function EditLegalPage({
  params,
}: PageProps<"/admin/legal/[doc]">) {
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
  params: PageProps<"/admin/legal/[doc]">["params"];
}) {
  const { doc } = await params;
  if (!isLegalDoc(doc)) notFound();
  const [data, permissions] = await Promise.all([
    getLegalForEdit(doc),
    currentPermissions(),
  ]);
  return (
    <>
      <AdminHeader
        title={LEGAL_DOCS[doc].title}
        eyebrow="Legal page"
        backHref="/admin/legal"
        backLabel="Legal pages"
      >
        <Link
          href={LEGAL_DOCS[doc].path}
          className="text-sm underline underline-offset-4"
        >
          View public page
        </Link>
      </AdminHeader>
      <p className="mt-4 text-sm text-muted">
        {data.isLive
          ? "Visitors see the edited version."
          : "Visitors see the original text until you publish."}
        {data.hasUnpublished ? " You have unpublished changes." : ""}
      </p>
      <div className="mt-10">
        <LegalEditor
          doc={doc}
          content={data.content}
          canPublish={permissions.has("pages.publish")}
          isLive={data.isLive}
        />
      </div>
    </>
  );
}
