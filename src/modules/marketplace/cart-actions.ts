"use server";

import { priceCartLines, type PricedLine } from "./queries";
import { cartSchema } from "./schemas";

/** Prices a browser cart with live data. Unknown or hidden items drop out. */
export async function priceCart(items: unknown): Promise<PricedLine[]> {
  const parsed = cartSchema.safeParse(items);
  if (!parsed.success) return [];
  return priceCartLines(parsed.data);
}
