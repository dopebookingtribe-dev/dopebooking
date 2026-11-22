import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminHeader, shortDate } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { listLegalForAdmin } from "@/modules/legal/queries";

export const metadata: Metadata = { title: "Legal pages" };

export default function LegalAdminPage() {
  return (
    <Container className="py-12">
      <AdminHeader title="Legal pages" />
      <p className="mt-4 max-w-2xl text-muted">
        Edit the imprint, privacy policy and terms. Each page keeps its original
        text until you publish an edited version. Fill in every [PLACEHOLDER]
        and have the texts reviewed before launch.
      </p>
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <List />
      </Suspense>
    </Container>
  );
}

async function List() {
  const docs = await listLegalForAdmin();
  return (
    <ul className="mt-10 grid gap-3 sm:grid-cols-2">
      {docs.map((doc) => (
        <li key={doc.doc}>
          <Link
            href={`/admin/legal/${doc.doc}`}
            className="group block h-full rounded-(--radius) border border-line bg-surface-1 p-5 transition-colors hover:border-accent"
          >
            <span className="font-display text-2xl group-hover:text-accent">
              {doc.title}
            </span>
            <span className="mt-2 block font-label text-xs text-muted">
              {doc.live
                ? `Edited version live since ${doc.publishedAt ? shortDate(doc.publishedAt) : "—"}`
                : "Original text"}
              {doc.unpublished ? " · unpublished changes" : ""}
            </span>
            <span
              className={`mt-1 block text-sm ${doc.placeholders ? "text-uv" : "text-success"}`}
            >
              {doc.placeholders
                ? `${doc.placeholders} placeholders to fill in`
                : "No placeholders left"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
