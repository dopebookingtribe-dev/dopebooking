import Link from "next/link";
import { Meta } from "@/components/ui/meta";
import { formatCents } from "@/modules/marketplace/schemas";
import { WorkflowBadge } from "@/modules/workflow/components/status-badge";
import { ORDER_STATUS, PART_STATUS } from "../labels";
import type { OrderView as OrderViewData } from "../queries";

export function OrderStatusBadge({
  status,
}: {
  status: keyof typeof ORDER_STATUS;
}) {
  return <WorkflowBadge {...ORDER_STATUS[status]} />;
}

/** One order, grouped by seller, with tracking and download links. */
export function OrderView({
  view,
  showFinance = false,
}: {
  view: OrderViewData;
  showFinance?: boolean;
}) {
  const { order, parts } = view;
  const money = (cents: number) => formatCents(cents, order.currency);
  const address = order.shipping_address as Record<
    string,
    string | null
  > | null;

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-10">
        {parts.map((part) => (
          <section
            key={part.id}
            aria-label={`From ${part.sellerName}`}
            className="rounded-(--radius) border border-line p-5"
          >
            <header className="flex flex-wrap items-center justify-between gap-3">
              <p>
                From{" "}
                {part.sellerSlug ? (
                  <Link
                    href={`/shop/sellers/${part.sellerSlug}`}
                    className="underline underline-offset-4"
                  >
                    {part.sellerName}
                  </Link>
                ) : (
                  part.sellerName
                )}
              </p>
              <WorkflowBadge {...PART_STATUS[part.status]} />
            </header>
            <ul className="mt-4 divide-y divide-line">
              {part.items.map((item) => (
                <li key={item.id} className="flex flex-col gap-2 py-3">
                  <div className="flex justify-between gap-4 text-sm">
                    <span>
                      {item.product_title}
                      {["Standard", "Download"].includes(item.variant_name)
                        ? ""
                        : ` — ${item.variant_name}`}
                      <span className="text-muted"> × {item.quantity}</span>
                    </span>
                    <span>{money(item.line_total)}</span>
                  </div>
                  {item.downloads.length ? (
                    <ul className="flex flex-wrap gap-2">
                      {item.downloads.map((file) => (
                        <li key={file.url}>
                          <a
                            href={file.url}
                            className="inline-flex min-h-11 items-center rounded-(--radius) border border-accent/60 px-3 text-sm text-accent hover:bg-accent hover:text-accent-ink"
                          >
                            Download {file.fileName}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
            {part.shipping_amount ? (
              <p className="flex justify-between border-t border-line pt-3 text-sm text-muted">
                <span>Shipping</span>
                <span>{money(part.shipping_amount)}</span>
              </p>
            ) : null}
            {part.tracking_number || part.carrier ? (
              <p className="mt-3 text-sm">
                Tracking:{" "}
                {[part.carrier, part.tracking_number]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
            {showFinance ? (
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-line pt-3 font-mono text-xs text-muted">
                <dt>Commission ({part.commission_rate_bps / 100}%)</dt>
                <dd className="text-right">{money(part.commission_amount)}</dd>
                <dt>Paid to seller</dt>
                <dd className="text-right">{money(part.seller_amount)}</dd>
                <dt>Transfer</dt>
                <dd className="text-right">
                  {part.transfer_status}
                  {part.stripe_transfer_id
                    ? ` (${part.stripe_transfer_id})`
                    : ""}
                </dd>
                {part.transfer_error ? (
                  <dd className="col-span-2 text-danger">
                    {part.transfer_error}
                  </dd>
                ) : null}
              </dl>
            ) : null}
          </section>
        ))}
        {["paid", "fulfilled"].includes(order.status) &&
        parts.some((p) => p.items.some((i) => i.downloads.length)) ? (
          <p className="text-sm text-muted">
            Download links are valid for 15 minutes; reload the page for fresh
            ones.
          </p>
        ) : null}
      </div>

      <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
        <dl className="divide-y divide-line border-y border-line text-sm">
          <div className="flex justify-between py-3">
            <dt className="text-muted">Items</dt>
            <dd>{money(order.items_total)}</dd>
          </div>
          <div className="flex justify-between py-3">
            <dt className="text-muted">Shipping</dt>
            <dd>{money(order.shipping_total)}</dd>
          </div>
          <div className="flex justify-between py-3 text-base font-medium">
            <dt>Total</dt>
            <dd>{money(order.total)}</dd>
          </div>
          {order.refunded_amount ? (
            <div className="flex justify-between py-3 text-success">
              <dt>Refunded</dt>
              <dd>{money(order.refunded_amount)}</dd>
            </div>
          ) : null}
        </dl>
        {order.shipping_name || address ? (
          <div>
            <Meta>Ship to</Meta>
            <p className="mt-2 text-sm whitespace-pre-line">
              {[
                order.shipping_name,
                address?.line1,
                address?.line2,
                [address?.postal_code, address?.city].filter(Boolean).join(" "),
                address?.country,
              ]
                .filter(Boolean)
                .join("\n")}
            </p>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
