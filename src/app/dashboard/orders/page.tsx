import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { formatCents } from "@/modules/marketplace/schemas";
import { OrderStatusBadge } from "@/modules/orders/components/order-view";
import { listMyOrders } from "@/modules/orders/queries";

export const metadata: Metadata = { title: "My orders" };

export default function MyOrdersPage() {
  return (
    <Container className="py-16">
      <h1 className="font-display text-headline">Orders</h1>
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <List />
      </Suspense>
    </Container>
  );
}

async function List() {
  const orders = await listMyOrders();
  if (!orders.length) {
    return (
      <div className="mt-10">
        <p className="text-muted">No orders yet.</p>
        <ButtonLink href="/shop" className="mt-6">
          Browse the shop
        </ButtonLink>
      </div>
    );
  }
  return (
    <ul className="mt-10 divide-y divide-line border-y border-line">
      {orders.map((order) => (
        <li key={order.id}>
          <Link
            href={`/dashboard/orders/${order.id}`}
            className="flex flex-wrap items-center justify-between gap-3 py-4 hover:text-accent"
          >
            <span>
              <span className="font-label text-sm">{order.reference}</span>
              <span className="ml-3 text-sm text-muted">
                {new Date(order.created_at).toLocaleDateString("en-GB")}
              </span>
            </span>
            <span className="flex items-center gap-4">
              {formatCents(order.total, order.currency)}
              <OrderStatusBadge status={order.status} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
