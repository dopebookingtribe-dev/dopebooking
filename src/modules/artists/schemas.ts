import { z } from "zod";
import type { LinkPlatform } from "@/lib/supabase/database.types";
import {
  checkboxSchema,
  countrySchema,
  optionalText,
  slugify,
  slugSchema,
  statusSchema,
} from "@/lib/validation";

// Re-exported for existing imports.
export { slugify, STATUSES } from "@/lib/validation";

// Keep in sync with public.valid_genres() in the artists migration.
export const GENRES = {
  progressive: "Progressive",
  "full-on": "Full-on",
  psychedelic: "Psychedelic",
  goa: "Goa",
  dark: "Dark",
  forest: "Forest",
  "hi-tech": "Hi-tech",
  twilight: "Twilight",
  zenonesque: "Zenonesque",
  "psy-techno": "Psy-techno",
  psybient: "Psybient",
  minimal: "Minimal",
} as const;

export type Genre = keyof typeof GENRES;
export const GENRE_KEYS = Object.keys(GENRES) as Genre[];

export function isGenre(value: unknown): value is Genre {
  return typeof value === "string" && value in GENRES;
}

export const LINK_PLATFORMS: Record<LinkPlatform, string> = {
  website: "Website",
  instagram: "Instagram",
  soundcloud: "SoundCloud",
  spotify: "Spotify",
  beatport: "Beatport",
  bandcamp: "Bandcamp",
  youtube: "YouTube",
  facebook: "Facebook",
  resident_advisor: "Resident Advisor",
  other: "Other",
};

const stageName = z
  .string()
  .trim()
  .min(1, "Enter the stage name.")
  .max(120, "Use at most 120 characters.");

export const createArtistSchema = z
  .object({ stage_name: stageName, slug: z.string().trim().optional() })
  .transform((data) => ({
    stage_name: data.stage_name,
    slug: data.slug ? data.slug : slugify(data.stage_name),
  }))
  .pipe(z.object({ stage_name: stageName, slug: slugSchema }));

export const artistDetailsSchema = z.object({
  stage_name: stageName,
  slug: slugSchema,
  tagline: optionalText(160),
  bio: optionalText(6000),
  country: countrySchema,
  based_in: optionalText(80),
  genres: z
    .array(z.enum(GENRE_KEYS as [Genre, ...Genre[]]))
    .max(6, "Choose up to 6 genres."),
  status: statusSchema,
  featured: checkboxSchema,
  sort_order: z.coerce.number().int("Use a whole number.").min(-1000).max(1000),
  booking_info: optionalText(1000).default(null),
  seo_title: optionalText(70).default(null),
  seo_description: optionalText(200).default(null),
});

const money = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : Number(value)))
  .refine(
    (value) => value === null || (Number.isInteger(value) && value >= 0),
    { message: "Use a whole amount, 0 or more." },
  );

export const artistPrivateSchema = z
  .object({
    fee_min: money,
    fee_max: money,
    fee_currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, "Use a 3-letter currency code, e.g. EUR."),
    booking_email: z
      .string()
      .trim()
      .toLowerCase()
      .refine((value) => value === "" || z.email().safeParse(value).success, {
        message: "Enter a valid email address.",
      })
      .transform((value) => (value === "" ? null : value)),
    internal_notes: optionalText(6000),
  })
  .refine(
    (data) =>
      data.fee_min === null ||
      data.fee_max === null ||
      data.fee_min <= data.fee_max,
    { message: "Minimum must not exceed maximum.", path: ["fee_max"] },
  );

export const artistLinkSchema = z.object({
  platform: z.enum(Object.keys(LINK_PLATFORMS) as [LinkPlatform]),
  url: z
    .url({ protocol: /^https$/, error: "Use a full https:// link." })
    .max(500),
});

export const artistLinksSchema = z
  .array(artistLinkSchema)
  .max(20, "Add at most 20 links.");
