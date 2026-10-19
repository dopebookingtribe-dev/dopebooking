import { z } from "zod";

// Shared building blocks for content forms (artists, events, galleries…).

export const STATUSES = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
} as const;

/** "Astral Projection Ø" -> "astral-projection-o" */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/ø/gi, "o")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use at most ${max} characters.`)
    .transform((value) => (value === "" ? null : value));

export const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `Enter the ${label}.`)
    .max(max, `Use at most ${max} characters.`);

export const slugSchema = z
  .string()
  .trim()
  .max(80, "Use at most 80 characters.")
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and single dashes.",
  );

export const statusSchema = z.enum(["draft", "published", "archived"]);

/** An unchecked checkbox is simply missing from FormData. */
export const checkboxSchema = z
  .union([z.literal("on"), z.literal("")])
  .optional()
  .transform((value) => value === "on");

export const countrySchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((value) => value === "" || /^[A-Z]{2}$/.test(value), {
    message: "Choose a country.",
  })
  .transform((value) => (value === "" ? null : value));

export const optionalUuid = z
  .string()
  .trim()
  .refine((value) => value === "" || z.uuid().safeParse(value).success, {
    message: "Choose an option from the list.",
  })
  .transform((value) => (value === "" ? null : value));

export const optionalHttpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) =>
      value === "" || z.url({ protocol: /^https$/ }).safeParse(value).success,
    { message: "Use a full https:// link." },
  )
  .transform((value) => (value === "" ? null : value));
