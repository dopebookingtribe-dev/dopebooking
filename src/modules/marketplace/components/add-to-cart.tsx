"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { addToCart } from "../cart-store";
import { formatCents, MAX_LINE_QUANTITY } from "../schemas";

export function AddToCart({
  variants,
  currency,
}: {
  variants: { id: string; name: string; price: number; inStock: boolean }[];
  currency: string;
}) {
  const firstAvailable =
    variants.find((variant) => variant.inStock) ?? variants[0];
  const [variantId, setVariantId] = useState(firstAvailable?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const groupId = useId();
  const selected = variants.find((variant) => variant.id === variantId);

  if (!selected) return <p className="text-muted">Currently unavailable.</p>;

  return (
    <div className="flex flex-col gap-6">
      <p className="font-display text-5xl">
        {formatCents(selected.price, currency)}
      </p>
      {variants.length > 1 ? (
        <fieldset>
          <legend id={groupId} className="mb-3 text-sm font-medium">
            Option
          </legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => (
              <label
                key={variant.id}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line-strong px-4 text-sm has-checked:border-accent has-checked:text-accent has-disabled:cursor-not-allowed has-disabled:opacity-40"
              >
                <input
                  type="radio"
                  name="variant"
                  value={variant.id}
                  checked={variant.id === variantId}
                  disabled={!variant.inStock}
                  onChange={() => {
                    setVariantId(variant.id);
                    setAdded(false);
                  }}
                  className="sr-only"
                />
                {variant.name}
                {!variant.inStock ? " (sold out)" : ""}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-2 text-sm font-medium">
          Quantity
          <select
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            className="min-h-11 rounded-(--radius) border border-line-strong bg-surface-1 px-3 text-base"
          >
            {Array.from(
              { length: MAX_LINE_QUANTITY },
              (_, index) => index + 1,
            ).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <Button
          disabled={!selected.inStock}
          onClick={() => {
            addToCart(selected.id, quantity);
            setAdded(true);
          }}
        >
          {selected.inStock ? "Add to cart" : "Sold out"}
        </Button>
      </div>
      <p role="status" className="min-h-6 text-sm text-success">
        {added ? (
          <>
            Added.{" "}
            <Link
              href="/cart"
              className="text-text underline underline-offset-4"
            >
              View cart
            </Link>
          </>
        ) : null}
      </p>
    </div>
  );
}
