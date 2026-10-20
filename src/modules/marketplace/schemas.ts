import { z } from "zod";
import type { SellerStatus } from "@/lib/supabase/database.types";
import {
  countrySchema,
  optionalHttpsUrl,
  optionalText,
  requiredText,
  slugSchema,
  statusSchema,
} from "@/lib/validation";

// The shop runs in EUR until payments (Phase 08) decide otherwise.
export const SHOP_CURRENCY = "EUR";
export const MAX_CART_LINES = 50;
export const MAX_LINE_QUANTITY = 20;

/** "25", "25.5", "25,50", "€ 25" -> 2550 cents; null if not a price. */
export function parsePriceToCents(input: string): number | null {
  const cleaned = input.replace(/[€\s]/g, "").replace(",", ".");
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, fraction = ""] = cleaned.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function centsToInput(cents: number) {
  return (cents / 100).toFixed(2);
}

export function formatCents(cents: number, currency = SHOP_CURRENCY) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export const SELLER_STATUS_LABELS: Record<SellerStatus, string> = {
  pending: "Under review",
  approved: "Approved",
  rejected: "Not approved",
  suspended: "Paused",
};

export const PRODUCT_TYPES = {
  physical: "Physical (shipped)",
  digital: "Digital (download)",
} as const;

const price = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const cents = parsePriceToCents(value);
    if (cents === null || cents < 50) {
      ctx.addIssue({
        code: "custom",
        message: "Enter a price of at least €0.50, e.g. 25 or 24.90.",
      });
      return z.NEVER;
    }
    return cents;
  });

const stock = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : Number(value)))
  .refine(
    (value) =>
      value === null ||
      (Number.isInteger(value) && value >= 0 && value <= 1_000_000),
    { message: "Use a whole number, or leave empty for unlimited." },
  );

const displayName = requiredText("shop name", 120);

export const sellerApplicationSchema = z.object({
  display_name: displayName,
  country: countrySchema,
  website: optionalHttpsUrl,
  bio: optionalText(2000),
  application_note: z
    .string()
    .trim()
    .min(20, "Tell us a bit more (at least 20 characters).")
    .max(4000),
});

export const sellerProfileSchema = z.object({
  display_name: displayName,
  country: countrySchema,
  website: optionalHttpsUrl,
  bio: optionalText(2000),
});

export const createProductSchema = z.object({
  title: requiredText("product name", 160),
  product_type: z.enum(["physical", "digital"]),
  price,
});

export const productDetailsSchema = z.object({
  title: requiredText("product name", 160),
  slug: slugSchema,
  description: optionalText(8000),
  product_type: z.enum(["physical", "digital"]),
  status: statusSchema,
});

export const variantRowSchema = z.object({
  id: z
    .string()
    .refine((value) => value === "" || z.uuid().safeParse(value).success)
    .transform((value) => (value === "" ? null : value)),
  name: requiredText("option name", 120),
  sku: optionalText(64),
  price,
  stock,
  active: z.boolean(),
});

export const variantsSchema = z
  .array(variantRowSchema)
  .min(1, "Keep at least one option (e.g. “Standard”).")
  .max(50, "Use at most 50 options.");

export const reviewSellerSchema = z.object({
  status: z.enum(["approved", "rejected", "suspended", "pending"]),
  note: optionalText(2000),
  commission_percent: z
    .string()
    .trim()
    .transform((value) =>
      value === "" ? null : Number(value.replace(",", ".")),
    )
    .refine((value) => value === null || (value >= 0 && value <= 50), {
      message: "Use a percentage between 0 and 50.",
    }),
});

export const cartSchema = z
  .array(
    z.object({
      variantId: z.uuid(),
      quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
    }),
  )
  .max(MAX_CART_LINES);

export type CartItem = z.infer<typeof cartSchema>[number];
