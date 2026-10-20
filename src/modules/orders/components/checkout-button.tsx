"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/modules/marketplace/cart-store";
import { startCheckout } from "../actions";

export function CheckoutButton({ testMode }: { testMode: boolean }) {
  const items = useCart();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <Button
        disabled={pending || !items.length}
        className="w-full"
        onClick={() =>
          startTransition(async () => {
            setError(undefined);
            const result = await startCheckout(items);
            if ("url" in result) window.location.assign(result.url);
            else setError(result.error);
          })
        }
      >
        {pending ? "Opening secure checkout…" : "Checkout"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <p className="text-xs text-muted">
        Secure payment by Stripe. Cards, Apple Pay and Google Pay.
        {testMode ? " Test mode: use card 4242 4242 4242 4242." : ""}
      </p>
    </div>
  );
}
