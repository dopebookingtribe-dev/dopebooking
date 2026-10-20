"use server";

import { getCurrentUser } from "@/lib/auth/dal";
import { hasPayments } from "@/lib/env.server";
import { cartSchema } from "@/modules/marketplace/schemas";
import { createCheckout, type CheckoutResult } from "./server";

/** Turns the browser cart into a pending order and a Stripe Checkout URL. */
export async function startCheckout(items: unknown): Promise<CheckoutResult> {
  if (!hasPayments()) return { error: "Checkout opens soon." };
  const parsed = cartSchema.safeParse(items);
  if (!parsed.success || !parsed.data.length) {
    return { error: "Your cart is empty." };
  }
  const user = await getCurrentUser();
  try {
    return await createCheckout(
      parsed.data,
      user ? { id: user.id, email: user.email } : null,
    );
  } catch (error) {
    console.error("Checkout failed", error);
    return { error: "Checkout failed. Please try again." };
  }
}
