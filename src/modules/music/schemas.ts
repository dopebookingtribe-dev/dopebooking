import { z } from "zod";
import type {
  LedgerEntryType,
  MusicFileFormat,
  MusicReleaseStatus,
  MusicReleaseType,
  WithdrawalStatus,
} from "@/lib/supabase/database.types";
import {
  checkboxSchema,
  optionalText,
  optionalUuid,
  requiredText,
  slugify,
  slugSchema,
} from "@/lib/validation";
import { parsePriceToCents } from "@/modules/marketplace/schemas";

export const MUSIC_CURRENCY = "EUR";

export const RELEASE_TYPES: Record<MusicReleaseType, string> = {
  track: "Single track",
  ep: "EP",
  album: "Album",
  bundle: "Bundle",
};

export const RELEASE_STATUSES: Record<MusicReleaseStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  published: "Live",
  rejected: "Needs changes",
  archived: "Unpublished",
};

export const FILE_FORMATS: Record<
  MusicFileFormat,
  { label: string; mime: string[]; extension: string }
> = {
  wav: {
    label: "WAV",
    mime: ["audio/wav", "audio/x-wav", "audio/wave"],
    extension: "wav",
  },
  flac: {
    label: "FLAC",
    mime: ["audio/flac", "audio/x-flac"],
    extension: "flac",
  },
  mp3: {
    label: "MP3 320",
    mime: ["audio/mpeg", "audio/mp3"],
    extension: "mp3",
  },
  aiff: {
    label: "AIFF",
    mime: ["audio/aiff", "audio/x-aiff"],
    extension: "aiff",
  },
};

export const FORMAT_KEYS = Object.keys(FILE_FORMATS) as MusicFileFormat[];

/** Supabase free plan: 50 MB per file. FLAC or MP3 fit; long WAVs may not. */
export const MAX_MASTER_BYTES = 50 * 1024 * 1024;
export const MAX_PREVIEW_BYTES = 15 * 1024 * 1024;

/** Guesses the format from a file's type or extension. */
export function formatOfFile(file: {
  name: string;
  type: string;
}): MusicFileFormat | null {
  const byMime = FORMAT_KEYS.find((key) =>
    FILE_FORMATS[key].mime.includes(file.type),
  );
  if (byMime) return byMime;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "aif") return "aiff";
  return FORMAT_KEYS.find((key) => FILE_FORMATS[key].extension === ext) ?? null;
}

const NOTES = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
] as const;
export const MUSICAL_KEYS = NOTES.flatMap((note) => [
  `${note} minor`,
  `${note} major`,
]);

export const LEDGER_TYPES: Record<LedgerEntryType, string> = {
  sale: "Sale",
  refund: "Refund",
  adjustment: "Adjustment",
  withdrawal: "Withdrawal",
  withdrawal_release: "Withdrawal returned",
};

export const WITHDRAWAL_STATUSES: Record<WithdrawalStatus, string> = {
  requested: "Requested",
  approved: "Approved",
  paid: "Paid",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

/** "6:05" from seconds. */
export function formatDuration(seconds: number | null | undefined) {
  if (!seconds || seconds < 0) return "";
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${rest}` : `${m}:${rest}`;
}

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

const optionalInt = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : Number(value)))
    .refine(
      (value) =>
        value === null ||
        (Number.isInteger(value) && value >= min && value <= max),
      { message: `${label} must be a whole number from ${min} to ${max}.` },
    );

const musicalKey = z
  .string()
  .trim()
  .refine((value) => value === "" || MUSICAL_KEYS.includes(value), {
    message: "Choose a key from the list.",
  })
  .transform((value) => (value === "" ? null : value));

const priceField = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : parsePriceToCents(value)))
  .refine((value) => value !== null, { message: "Enter a price like 1.99." })
  .refine((value) => value !== null && value >= 50 && value <= 100000, {
    message: "Prices go from €0.50 to €1,000.",
  });

export const createReleaseSchema = z
  .object({
    title: requiredText("title", 160),
    release_type: z.enum(Object.keys(RELEASE_TYPES) as [MusicReleaseType]),
  })
  .transform((data) => ({ ...data, slug: slugify(data.title) || "release" }));

export const releaseDetailsSchema = z.object({
  title: requiredText("title", 160),
  slug: slugSchema,
  genre_id: optionalUuid,
  subgenre_id: optionalUuid,
  bpm: optionalInt(40, 250, "BPM"),
  musical_key: musicalKey,
  release_date: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), {
      message: "Choose a date.",
    })
    .transform((value) => (value === "" ? null : value)),
  label: optionalText(120),
  catalog_number: optionalText(40),
  description: optionalText(6000),
  credits: optionalText(3000),
  price_amount: priceField,
  on_sale: checkboxSchema,
});

export const trackSchema = z.object({
  title: requiredText("track title", 160),
  bpm: optionalInt(40, 250, "BPM"),
  musical_key: musicalKey,
  isrc: z
    .string()
    .trim()
    .toUpperCase()
    .transform((value) => value.replace(/[\s-]/g, ""))
    .refine(
      (value) => value === "" || /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(value),
      {
        message: "ISRC looks like DEABC2600001.",
      },
    )
    .transform((value) => (value === "" ? null : value)),
});

/** IBAN with the mod-97 checksum, so typos are caught before a payout. */
export function isValidIban(input: string) {
  const iban = input.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const digits = rearranged.replace(/[A-Z]/g, (c) =>
    String(c.charCodeAt(0) - 55),
  );
  let remainder = 0;
  for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  return remainder === 1;
}

export const payoutDetailsSchema = z.object({
  account_holder: requiredText("account holder", 120),
  iban: z
    .string()
    .transform((value) => value.replace(/\s/g, "").toUpperCase())
    .refine(isValidIban, { message: "Check the IBAN, it doesn't look right." }),
  bic: z
    .string()
    .trim()
    .toUpperCase()
    .refine(
      (value) =>
        value === "" || /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(value),
      { message: "A BIC has 8 or 11 letters and digits." },
    )
    .transform((value) => (value === "" ? null : value)),
  country: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => value === "" || /^[A-Z]{2}$/.test(value), {
      message: "Choose a country.",
    })
    .transform((value) => (value === "" ? null : value)),
});

export const amountSchema = z.object({
  amount: z
    .string()
    .trim()
    .transform((value) => parsePriceToCents(value))
    .refine((value) => value !== null && value > 0, {
      message: "Enter an amount like 25.00.",
    }),
});

export const musicSettingsSchema = z.object({
  commission_percent: z.coerce
    .number()
    .min(0, "Use 0 to 50.")
    .max(50, "Use 0 to 50."),
  hold_days: z.coerce
    .number()
    .int()
    .min(0, "Use 0 to 120.")
    .max(120, "Use 0 to 120."),
  min_withdrawal: z
    .string()
    .trim()
    .transform((value) => parsePriceToCents(value))
    .refine((value) => value !== null && value >= 100, {
      message: "Use at least €1.00.",
    }),
});

export const genreSchema = z
  .object({
    name: requiredText("genre name", 60),
    slug: z.string().trim(),
    parent_id: optionalUuid,
    sort_order: z.coerce.number().int().min(-1000).max(1000),
    visible: checkboxSchema,
  })
  .transform((data) => ({ ...data, slug: data.slug || slugify(data.name) }))
  .pipe(
    z.object({
      name: z.string(),
      slug: slugSchema,
      parent_id: z.string().nullable(),
      sort_order: z.number(),
      visible: z.boolean(),
    }),
  );

export const musicCartSchema = z.array(z.uuid()).max(50);
