import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminHeader, EditSection } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { formatCents } from "@/modules/marketplace/schemas";
import { MarkShippedForm } from "@/modules/orders/components/seller-forms";
import { PART_STATUS } from "@/modules/orders/labels";
import { getMySellerOrder } from "@/modules/orders/queries";
import { markShipped } from "@/modules/orders/seller-actions";
import { WorkflowBadge } from "@/modules/workflow/components/status-badge";

export const metadata: Metadata = { title: "Shop order" };

export default function SellerOrderPage({
  params,
}: PageProps<"/dashboard/seller/orders/[id]">) {
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
  params: PageProps<"/dashboard/seller/orders/[id]">["params"];
}) {
  const { id } = await params;
  const data = await getMySellerOrder(id);
  if (!data) notFound();
  const { part, items, order } = data;
  const address = order?.shipping_address as Record<
    string,
    string | null
  > | null;
  const physical = items.some((item) => item.product_type === "physical");

  return (
    <>
      <AdminHeader
        title={`Order ${order?.reference ?? ""}`}
        eyebrow="My shop"
        backHref="/dashboard/seller/orders"
        backLabel="All orders"
      >
        <WorkflowBadge {...PART_STATUS[part.status]} />
      </AdminHeader>
      <div className="mt-12 flex flex-col gap-16">
        <EditSection title="Items" description="Prices as paid by the buyer.">
          <ul className="divide-y divide-line border-y border-line text-sm">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 py-3">
                <span>
                  {item.product_title} — {item.variant_name}{" "}
                  <span className="text-muted">× {item.quantity}</span>
                </span>
                <span>{formatCents(item.line_total)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 grid grid-cols-2 gap-1 text-sm">
            <dt className="text-muted">Items</dt>
            <dd className="text-right">{formatCents(part.items_total)}</dd>
            <dt className="text-muted">Shipping</dt>
            <dd className="text-right">{formatCents(part.shipping_amount)}</dd>
            <dt className="text-muted">
              Commission ({part.commission_rate_bps / 100}%)
            </dt>
            <dd className="text-right">
              − {formatCents(part.commission_amount)}
            </dd>
            <dt className="font-medium">You receive</dt>
            <dd className="text-right font-medium">
              {formatCents(part.seller_amount)}
            </dd>
          </dl>
        </EditSection>
        {physical ? (
          <EditSection
            title="Ship to"
            description="Use this address for this order only."
          >
            <p className="text-sm whitespace-pre-line">
              {[
                order?.shipping_name,
                address?.line1,
                address?.line2,
                [address?.postal_code, address?.city].filter(Boolean).join(" "),
                address?.state,
                address?.country,
              ]
                .filter(Boolean)
                .join("\n") || "No address (digital order)."}
            </p>
          </EditSection>
        ) : null}
        <EditSection
          title="Fulfilment"
          description={
            physical
              ? "Add tracking when you hand it to the carrier."
              : "Digital items are delivered automatically."
          }
        >
          {part.status === "paid" ? (
            <MarkShippedForm action={markShipped.bind(null, part.id)} />
          ) : (
            <p className="text-sm text-muted">
              {part.status === "shipped"
                ? `Shipped${part.carrier || part.tracking_number ? `: ${[part.carrier, part.tracking_number].filter(Boolean).join(" · ")}` : ""}.`
                : PART_STATUS[part.status].label}
            </p>
          )}
        </EditSection>
      </div>
    </>
  );
}
