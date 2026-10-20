import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  AdminHeader,
  AdminTable,
  shortDate,
} from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import type { SellerStatus } from "@/lib/supabase/database.types";
import { SellerStatusBadge } from "@/modules/marketplace/components/seller-status-badge";
import { listSellersForAdmin } from "@/modules/marketplace/queries";
import { SELLER_STATUS_LABELS } from "@/modules/marketplace/schemas";

export const metadata: Metadata = { title: "Sellers" };

const FILTERS: (SellerStatus | "all")[] = [
  "pending",
  "approved",
  "suspended",
  "rejected",
  "all",
];

export default function AdminSellersPage({
  searchParams,
}: PageProps<"/admin/sellers">) {
  return (
    <Container className="py-12">
      <AdminHeader title="Sellers" />
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <List searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function List({
  searchParams,
}: {
  searchParams: PageProps<"/admin/sellers">["searchParams"];
}) {
  const raw = (await searchParams).status;
  const filter = FILTERS.find((item) => item === raw) ?? "pending";
  const sellers = await listSellersForAdmin(filter);
  return (
    <>
      <nav aria-label="Filter sellers" className="mt-8">
        <ul className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <li key={item}>
              <Link
                href={`/admin/sellers?status=${item}`}
                aria-current={filter === item ? "page" : undefined}
                className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 text-sm text-muted hover:text-text aria-[current=page]:border-accent aria-[current=page]:text-accent"
              >
                {item === "all" ? "All" : SELLER_STATUS_LABELS[item]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <AdminTable
        columns={["Shop", "Status", "Country", "Applied"]}
        empty="No sellers here."
        rows={sellers.map((seller) => ({
          key: seller.id,
          href: `/admin/sellers/${seller.id}`,
          cells: [
            seller.display_name,
            <SellerStatusBadge key="status" status={seller.status} />,
            seller.country ?? "—",
            shortDate(seller.created_at),
          ],
        }))}
      />
    </>
  );
}
