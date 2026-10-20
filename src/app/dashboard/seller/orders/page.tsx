import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { formatCents } from "@/modules/marketplace/schemas";
import { PART_STATUS } from "@/modules/orders/labels";
import { listMySellerOrders } from "@/modules/orders/queries";
import { WorkflowBadge } from "@/modules/workflow/components/status-badge";

export const metadata: Metadata = { title: "Shop orders" };

export default function SellerOrdersPage() {
  return (
    <Container className="py-12">
      <AdminHeader
        title="Orders"
        eyebrow="My shop"
        backHref="/dashboard/seller"
        backLabel="My shop"
      />
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <List />
      </Suspense>
    </Container>
  );
}

async function List() {
  const orders = await listMySellerOrders();
  if (!orders.length) return <p className="mt-10 text-muted">No orders yet.</p>;
  return (
    <ul className="mt-10 divide-y divide-line border-y border-line">
      {orders.map((order) => (
        <li key={order.id}>
          <Link
            href={`/dashboard/seller/orders/${order.id}`}
            className="flex flex-wrap items-center justify-between gap-3 py-4 hover:text-accent"
          >
            <span className="text-sm">
              {new Date(order.created_at).toLocaleDateString("en-GB")}
              <span className="ml-3 text-muted">
                You receive {formatCents(order.seller_amount)}
              </span>
            </span>
            <WorkflowBadge {...PART_STATUS[order.status]} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
