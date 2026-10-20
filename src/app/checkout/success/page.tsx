import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { ClearCart } from "@/modules/orders/components/clear-cart";
import {
  OrderStatusBadge,
  OrderView,
} from "@/modules/orders/components/order-view";
import { getOrderWithToken } from "@/modules/orders/queries";

export const metadata: Metadata = {
  title: "Thank you",
  robots: { index: false },
};

export default function CheckoutSuccessPage({
  searchParams,
}: PageProps<"/checkout/success">) {
  return (
    <Container className="py-16">
      <Suspense fallback={<p className="text-muted">Loading your order…</p>}>
        <Result searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Result({
  searchParams,
}: {
  searchParams: PageProps<"/checkout/success">["searchParams"];
}) {
  const { order: id, token } = await searchParams;
  const view = await getOrderWithToken(
    String(id ?? ""),
    typeof token === "string" ? token : undefined,
  );
  if (!view) {
    return (
      <>
        <h1 className="font-display text-headline">Order not found</h1>
        <p className="mt-4 text-muted">
          Check your email for the confirmation, or contact us.
        </p>
      </>
    );
  }
  const { order } = view;
  const paid =
    order.status !== "pending_payment" && order.status !== "cancelled";
  const link = `/orders/${order.id}?token=${encodeURIComponent(String(token))}`;

  return (
    <>
      <ClearCart />
      <Meta>Order {order.reference}</Meta>
      <h1 className="mt-3 font-display text-headline">
        {paid ? "Thank you!" : "Payment processing…"}
      </h1>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <OrderStatusBadge status={order.status} />
        {!paid ? (
          <Link
            href={`/checkout/success?order=${order.id}&token=${encodeURIComponent(String(token))}`}
            className="text-sm underline underline-offset-4"
          >
            Refresh
          </Link>
        ) : null}
      </div>
      <p className="mt-6 max-w-xl text-muted">
        {paid
          ? "We've emailed your confirmation. Sellers ship their items separately; downloads are below."
          : "We're confirming your payment with the bank. This usually takes a few seconds."}
      </p>
      <p className="mt-2 text-sm text-muted">
        Keep this private link to see your order later:{" "}
        <Link
          href={link}
          className="break-all text-text underline underline-offset-4"
        >
          order page
        </Link>
      </p>
      <div className="mt-12">
        <OrderView view={view} />
      </div>
      <ButtonLink href="/shop" variant="secondary" className="mt-12">
        Continue shopping
      </ButtonLink>
    </>
  );
}
