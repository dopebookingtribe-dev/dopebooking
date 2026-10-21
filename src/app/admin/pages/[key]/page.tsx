import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { requirePermission } from "@/lib/auth/permissions";
import {
  getBuilderOptions,
  getPageForEdit,
  listLibraryImages,
} from "@/modules/cms/admin-queries";
import { PageBuilder } from "@/modules/cms/components/page-builder";
import { isPageKey, PAGES } from "@/modules/cms/pages";

type Props = PageProps<"/admin/pages/[key]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { key } = await params;
  return { title: isPageKey(key) ? `Edit ${PAGES[key].title}` : "Not found" };
}

export default function EditPagePage({ params }: Props) {
  return (
    <Container className="py-16">
      <Suspense fallback={<p className="text-muted">Loading editor…</p>}>
        <Editor params={params} />
      </Suspense>
    </Container>
  );
}

async function Editor({ params }: { params: Props["params"] }) {
  const { key } = await params;
  if (!isPageKey(key)) notFound();
  const { permissions } = await requirePermission(
    "pages.edit",
    `/admin/pages/${key}`,
  );
  const [page, library, options] = await Promise.all([
    getPageForEdit(key),
    listLibraryImages(),
    getBuilderOptions(),
  ]);
  return (
    <>
      <AdminHeader
        title={PAGES[key].title}
        backHref="/admin/pages"
        backLabel="All pages"
      />
      <p className="mt-3 font-label text-muted">{PAGES[key].path}</p>
      <div className="mt-8">
        <PageBuilder
          pageKey={key}
          title={PAGES[key].title}
          path={PAGES[key].path}
          initial={page.content}
          state={page}
          canPublish={permissions.has("pages.publish")}
          library={library}
          artists={options.artists}
          categories={options.categories}
        />
      </div>
    </>
  );
}
