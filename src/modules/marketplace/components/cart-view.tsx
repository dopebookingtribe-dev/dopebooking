"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Meta } from "@/components/ui/meta";
import { priceCart } from "../cart-actions";
import { replaceCart, setCartQuantity, useCart } from "../cart-store";
import type { PricedLine } from "../queries";
import { formatCents } from "../schemas";

export function CartView() {
  const items = useCart();
  const [lines, setLines] = useState<PricedLine[] | null>(null);
  const [pending, startTransition] = useTransition();
  const key = JSON.stringify(items);

  useEffect(() => {
    startTransition(async () => {
      const priced = await priceCart(JSON.parse(key));
      setLines(priced);
      // Drop items that no longer exist or are hidden.
      const known = new Set(priced.map((line) => line.variantId));
      const current = JSON.parse(key) as {
        variantId: string;
        quantity: number;
      }[];
      if (current.some((item) => !known.has(item.variantId))) {
        replaceCart(current.filter((item) => known.has(item.variantId)));
      }
    });
  }, [key]);

  if (!items.length) {
    return (
      <div className="mt-10">
        <p className="text-muted">Your cart is empty.</p>
        <ButtonLink href="/shop" className="mt-6">
          Browse the shop
        </ButtonLink>
      </div>
    );
  }
  if (!lines) return <p className="mt-10 text-muted">Loading prices…</p>;

  const byCurrency = new Map<string, number>();
  for (const line of lines) {
    if (!line.available) continue;
    byCurrency.set(
      line.currency,
      (byCurrency.get(line.currency) ?? 0) + line.unitPrice * line.quantity,
    );
  }

  return (
    <div
      className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"
      aria-busy={pending}
    >
      <ul className="divide-y divide-line border-y border-line">
        {lines.map((line) => (
          <li
            key={line.variantId}
            className="grid grid-cols-[5rem_1fr] gap-4 py-4 sm:grid-cols-[6rem_1fr_auto]"
          >
            <div className="relative aspect-square overflow-hidden rounded-(--radius) bg-surface-2">
              {line.image ? (
                <Image
                  src={line.image.url}
                  alt=""
                  fill
                  sizes="6rem"
                  className="object-cover"
                />
              ) : null}
            </div>
            <div>
              <Link
                href={`/shop/${line.productSlug}`}
                className="font-display text-2xl hover:text-accent"
              >
                {line.productTitle}
              </Link>
              <p className="text-sm text-muted">{line.variantName}</p>
              {!line.available ? (
                <p className="mt-1 text-sm text-danger">Sold out</p>
              ) : null}
              <p className="mt-1 text-sm">
                {formatCents(line.unitPrice, line.currency)} each
              </p>
            </div>
            <div className="col-span-2 flex items-center gap-3 sm:col-span-1 sm:flex-col sm:items-end">
              <label className="flex items-center gap-2 text-sm">
                <span className="sr-only">
                  Quantity for {line.productTitle}
                </span>
                <select
                  value={line.quantity}
                  onChange={(event) =>
                    setCartQuantity(line.variantId, Number(event.target.value))
                  }
                  className="min-h-11 rounded-(--radius) border border-line-strong bg-surface-1 px-3"
                >
                  {Array.from(
                    { length: Math.max(line.maxQuantity, 1) },
                    (_, index) => index + 1,
                  ).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => setCartQuantity(line.variantId, 0)}
                className="min-h-11 text-sm text-muted underline-offset-4 hover:text-text hover:underline"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
        <Meta>Subtotal</Meta>
        {[...byCurrency.entries()].map(([currency, total]) => (
          <p key={currency} className="font-display text-5xl">
            {formatCents(total, currency)}
          </p>
        ))}
        <p className="text-sm text-muted">
          Shipping and taxes are calculated at checkout.
        </p>
        <p className="rounded-(--radius) border border-line p-4 text-sm">
          <strong className="font-medium">Checkout opens soon.</strong> Your
          cart is saved on this device until then.
        </p>
      </aside>
    </div>
  );
}
