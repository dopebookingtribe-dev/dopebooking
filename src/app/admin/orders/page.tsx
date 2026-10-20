import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  AdminHeader,
  AdminTable,
  shortDate,
} from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { formatCents } from "@/modules/marketplace/schemas";
import { OrderStatusBadge } from "@/modules/orders/components/order-view";
import { listOrdersForAdmin } from "@/modules/orders/queries";

export const metadata: Metadata = { title: "Orders" };

const FILTERS = [
  { key: "paid", label: "Paid" },
  { key: "attention", label: "Needs attention" },
  { key: "all", label: "All" },
] as const;

export default function AdminOrdersPage({
  searchParams,
}: PageProps<"/admin/orders">) {
  return (
    <Container className="py-12">
      <AdminHeader title="Orders" />
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <List searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function List({
  searchParams,
}: {
  searchParams: PageProps<"/admin/orders">["searchParams"];
}) {
  const raw = (await searchParams).filter;
  const filter = FILTERS.find((item) => item.key === raw)?.key ?? "paid";
  const orders = await listOrdersForAdmin(filter);
  return (
    <>
      <nav aria-label="Filter orders" className="mt-8">
        <ul className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <li key={item.key}>
              <Link
                href={`/admin/orders?filter=${item.key}`}
                aria-current={filter === item.key ? "page" : undefined}
                className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 text-sm text-muted hover:text-text aria-[current=page]:border-accent aria-[current=page]:text-accent"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <AdminTable
        columns={["Order", "Status", "Total", "Buyer", "Date"]}
        empty="No orders here."
        rows={orders.map((order) => ({
          key: order.id,
          href: `/admin/orders/${order.id}`,
          cells: [
            <>
              <span className="font-mono">{order.reference}</span>
              {order.needs_attention ? (
                <span className="ml-2 text-xs text-danger">⚠ Attention</span>
              ) : null}
            </>,
            <OrderStatusBadge key="status" status={order.status} />,
            formatCents(order.total, order.currency),
            order.buyer_email ?? "—",
            shortDate(order.created_at),
          ],
        }))}
      />
    </>
  );
}
