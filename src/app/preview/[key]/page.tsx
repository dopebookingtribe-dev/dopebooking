import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requirePermission } from "@/lib/auth/permissions";
import { getPageDraft } from "@/modules/cms/admin-queries";
import { PageSections } from "@/modules/cms/components/page-sections";
import { isPageKey, PAGES } from "@/modules/cms/pages";

export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false },
};

export default function PreviewPage({ params }: PageProps<"/preview/[key]">) {
  return (
    <Suspense fallback={<p className="p-10 text-muted">Loading preview…</p>}>
      <Preview params={params} />
    </Suspense>
  );
}

async function Preview({
  params,
}: {
  params: PageProps<"/preview/[key]">["params"];
}) {
  const { key } = await params;
  if (!isPageKey(key)) notFound();
  await requirePermission("pages.edit", `/preview/${key}`);
  const content = await getPageDraft(key);
  return (
    <>
      <div
        role="note"
        className="sticky top-16 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-uv/60 bg-bg/95 px-(--gutter) py-2 text-sm backdrop-blur"
      >
        <span className="text-uv">
          Draft preview of {PAGES[key].title}. Visitors don&apos;t see this
          version until it is published.
        </span>
        <Link
          href={`/admin/pages/${key}`}
          className="underline underline-offset-4 hover:text-accent"
        >
          Back to the editor
        </Link>
      </div>
      <PageSections content={content} title={PAGES[key].title} preview />
    </>
  );
}
