import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import {
  OrderStatusBadge,
  OrderView,
} from "@/modules/orders/components/order-view";
import { getOrderWithToken } from "@/modules/orders/queries";

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false },
};

// Guest orders: access with the private link from the confirmation email.
export default function GuestOrderPage({
  params,
  searchParams,
}: PageProps<"/orders/[id]">) {
  return (
    <Container className="py-16">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Order params={params} searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Order({
  params,
  searchParams,
}: Pick<PageProps<"/orders/[id]">, "params" | "searchParams">) {
  const [{ id }, { token }] = await Promise.all([params, searchParams]);
  const view = await getOrderWithToken(
    id,
    typeof token === "string" ? token : undefined,
  );
  if (!view) notFound();
  return (
    <>
      <Meta>Order {view.order.reference}</Meta>
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
