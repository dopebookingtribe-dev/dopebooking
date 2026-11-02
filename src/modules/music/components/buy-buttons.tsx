"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonClasses } from "@/components/ui/button";
import { addMusicToCart, useMusicCart } from "@/modules/marketplace/cart-store";
import { formatCents } from "@/modules/marketplace/schemas";

/** Add to cart or buy straight away. One copy per release. */
export function BuyButtons({
  releaseId,
  price,
  currency,
  onSale,
}: {
  releaseId: string;
  price: number | null;
  currency: string;
  onSale: boolean;
}) {
  const router = useRouter();
  const cart = useMusicCart();
  if (!onSale || price === null) {
    return <p className="text-muted">Not for sale right now.</p>;
  }
  const inCart = cart.includes(releaseId);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        onClick={() => {
          addMusicToCart(releaseId);
          router.push("/cart");
        }}
      >
        Buy {formatCents(price, currency)}
      </Button>
      {inCart ? (
        <Link href="/cart" className={buttonClasses("secondary")}>
          In your cart ✓
        </Link>
      ) : (
        <Button variant="secondary" onClick={() => addMusicToCart(releaseId)}>
          Add to cart
        </Button>
      )}
    </div>
  );
}
