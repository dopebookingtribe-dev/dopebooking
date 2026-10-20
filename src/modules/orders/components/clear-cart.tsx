"use client";

import { useEffect } from "react";
import { replaceCart } from "@/modules/marketplace/cart-store";

/** Empties the browser cart once an order has been placed. */
export function ClearCart() {
  useEffect(() => replaceCart([]), []);
  return null;
}
