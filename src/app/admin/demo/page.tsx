import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { requirePermission } from "@/lib/auth/permissions";
import { DemoRemover } from "@/modules/admin/demo-remover";
import { countDemoContent } from "@/modules/admin/queries";

export const metadata: Metadata = { title: "Demo content" };

export default function DemoPage() {
  return (
    <Container className="py-16">
      <AdminHeader title="Demo content" />
      <div className="mt-4 flex max-w-2xl flex-col gap-3 text-muted">
        <p>
          Sample records show how the site looks with content. They are marked
          as demo in the database and carry a “Demo” label on the site (turn the
          label off in Site settings).
        </p>
        <p>
          Replace them one by one as real content arrives, or remove them all at
          once. Records with bookings or orders are archived, not deleted.
        </p>
      </div>
      <Suspense fallback={<p className="mt-10 text-muted">Counting…</p>}>
        <Counts />
      </Suspense>
    </Container>
  );
}

async function Counts() {
  await requirePermission("demo.manage", "/admin/demo");
  const counts = await countDemoContent();
  const total = counts.reduce((sum, row) => sum + row.count, 0);
  return (
    <>
      <dl className="mt-10 grid max-w-2xl grid-cols-2 gap-px overflow-hidden rounded-(--radius) border border-line bg-line sm:grid-cols-4">
        {counts.map((row) => (
          <div key={row.table} className="bg-bg p-4">
            <dt className="text-sm text-muted">{row.label}</dt>
            <dd className="mt-1 font-label text-3xl">{row.count}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-10">
        <DemoRemover total={total} />
      </div>
    </>
  );
}
