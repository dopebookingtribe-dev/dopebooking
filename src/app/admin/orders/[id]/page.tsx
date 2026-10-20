import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminHeader, EditSection } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import {
  refundOrderAction,
  retryTransfersAction,
} from "@/modules/orders/admin-actions";
import {
  OrderStatusBadge,
  OrderView,
} from "@/modules/orders/components/order-view";
import { RefundForm } from "@/modules/orders/components/refund-form";
import { ActionButton } from "@/modules/orders/components/seller-forms";
import { getOrderForAdmin } from "@/modules/orders/queries";

export const metadata: Metadata = { title: "Order" };

export default function AdminOrderPage({
  params,
}: PageProps<"/admin/orders/[id]">) {
  return (
    <Container className="py-12">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Detail params={params} />
      </Suspense>
    </Container>
  );
}

async function Detail({
  params,
}: {
  params: PageProps<"/admin/orders/[id]">["params"];
}) {
  const { id } = await params;
  const view = await getOrderForAdmin(id);
  if (!view) notFound();
  const { order, parts } = view;
  const refundable = order.total - order.refunded_amount;
  const hasFailedTransfers = parts.some(
    (part) => part.transfer_status === "failed",
  );

  return (
    <>
      <AdminHeader
        title={`Order ${order.reference}`}
        eyebrow={order.buyer_email ?? "Guest"}
        backHref="/admin/orders"
        backLabel="All orders"
      >
        <OrderStatusBadge status={order.status} />
      </AdminHeader>
      {order.needs_attention ? (
        <p
          role="alert"
          className="mt-8 rounded-(--radius) border border-danger/50 p-4 text-sm text-danger"
        >
          {order.needs_attention}
        </p>
      ) : null}
      <div className="mt-12 flex flex-col gap-16">
        <EditSection
          title="Order"
          description={`Stripe payment: ${order.stripe_payment_intent_id ?? "—"}`}
        >
          <OrderView view={view} showFinance />
        </EditSection>
        {hasFailedTransfers ? (
          <EditSection
            title="Seller transfers"
            description="A transfer to a seller failed (e.g. their payouts were restricted)."
          >
            <ActionButton
              action={retryTransfersAction.bind(null, order.id)}
              variant="secondary"
            >
              Retry failed transfers
            </ActionButton>
          </EditSection>
        ) : null}
        {order.stripe_payment_intent_id && refundable > 0 ? (
          <EditSection
            title="Refund"
            description="Refunds the buyer's card and takes back sellers' shares proportionally."
          >
            <RefundForm
              refundable={refundable}
              action={refundOrderAction.bind(null, order.id)}
            />
          </EditSection>
        ) : null}
      </div>
    </>
  );
}
