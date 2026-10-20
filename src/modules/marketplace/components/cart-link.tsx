"use client";

import Link from "next/link";
import { useCart } from "../cart-store";

export function CartLink({ className = "" }: { className?: string }) {
  const items = useCart();
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <Link
      href="/cart"
      className={`inline-flex min-h-11 items-center gap-1.5 text-sm text-muted transition-colors hover:text-text ${className}`}
    >
      Cart
      {count ? (
        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 font-label text-xs text-accent-ink">
          {count}
          <span className="sr-only"> items</span>
        </span>
      ) : null}
    </Link>
  );
}
