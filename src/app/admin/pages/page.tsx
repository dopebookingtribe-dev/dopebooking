import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { requirePermission } from "@/lib/auth/permissions";
import { listPagesForAdmin } from "@/modules/cms/admin-queries";

export const metadata: Metadata = { title: "Pages" };

const STATE = {
  default: { label: "Built-in content", tone: "border-line-strong text-muted" },
  draft: { label: "Draft, not published", tone: "border-uv/60 text-uv" },
  changes: { label: "Unpublished changes", tone: "border-uv/60 text-uv" },
  live: { label: "Live", tone: "border-success/50 text-success" },
} as const;

export default function AdminPagesPage() {
  return (
    <Container className="py-16">
      <AdminHeader title="Pages" />
      <p className="mt-4 max-w-2xl text-muted">
        Every public page is built from sections. Edit text, photos and order,
        preview the draft, then publish.
      </p>
      <Suspense fallback={<p className="mt-10 text-muted">Loading pages…</p>}>
        <PageList />
      </Suspense>
    </Container>
  );
}

async function PageList() {
  await requirePermission("pages.edit", "/admin/pages");
  const pages = await listPagesForAdmin();
  return (
    <ul className="mt-10 divide-y divide-line rounded-(--radius) border border-line">
      {pages.map((page) => (
        <li key={page.key}>
          <Link
            href={`/admin/pages/${page.key}`}
            className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-surface-1"
          >
            <span>
              <span className="block font-semibold">{page.title}</span>
              <span className="block font-label text-sm text-muted">
                {page.path}
              </span>
            </span>
            <span
              className={`rounded-full border px-3 py-0.5 font-label text-xs ${STATE[page.state].tone}`}
            >
              {STATE[page.state].label}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
