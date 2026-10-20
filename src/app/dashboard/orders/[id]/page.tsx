import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import {
  OrderStatusBadge,
  OrderView,
} from "@/modules/orders/components/order-view";
import { getMyOrder } from "@/modules/orders/queries";

export const metadata: Metadata = { title: "Order" };

export default function MyOrderPage({
  params,
}: PageProps<"/dashboard/orders/[id]">) {
  return (
    <Container className="py-12">
      <Link
        href="/dashboard/orders"
        className="text-sm text-muted hover:text-text"
      >
        ← All orders
      </Link>
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <Order params={params} />
      </Suspense>
    </Container>
  );
}

async function Order({
  params,
}: {
  params: PageProps<"/dashboard/orders/[id]">["params"];
}) {
  const { id } = await params;
  const view = await getMyOrder(id);
  if (!view) notFound();
  return (
    <>
      <Meta className="mt-8">Order {view.order.reference}</Meta>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-headline">Your order</h1>
        <OrderStatusBadge status={view.order.status} />
      </div>
      <div className="mt-12">
        <OrderView view={view} />
      </div>
    </>
  );
}
