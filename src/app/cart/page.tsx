import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { hasPayments, isStripeTestMode } from "@/lib/env.server";
import { CartView } from "@/modules/marketplace/components/cart-view";
import { CheckoutButton } from "@/modules/orders/components/checkout-button";

export const metadata: Metadata = { title: "Cart", robots: { index: false } };

export default function CartPage() {
  return (
    <Container className="py-16">
      <Meta>Shop</Meta>
      <h1 className="mt-3 font-display text-headline">Cart</h1>
      <CartView
        checkout={
          hasPayments() ? (
            <CheckoutButton testMode={isStripeTestMode()} />
          ) : (
            <p className="rounded-(--radius) border border-line p-4 text-sm">
              <strong className="font-medium">Checkout opens soon.</strong> Your
              cart is saved on this device until then.
            </p>
          )
        }
      />
    </Container>
  );
}
