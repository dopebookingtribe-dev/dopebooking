import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { CartView } from "@/modules/marketplace/components/cart-view";

export const metadata: Metadata = { title: "Cart", robots: { index: false } };

export default function CartPage() {
  return (
    <Container className="py-16">
      <Meta>Shop</Meta>
      <h1 className="mt-3 font-display text-headline">Cart</h1>
      <CartView />
    </Container>
  );
}
