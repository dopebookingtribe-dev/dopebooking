import { z } from "zod";
import type {
  ArtArtistKind,
  ArtCollection,
  ArtLinkPlatform,
  ArtPartnerKind,
} from "@/lib/supabase/database.types";
import {
  checkboxSchema,
  countrySchema,
  optionalHttpsUrl,
  optionalText,
  optionalUuid,
  requiredText,
  slugify,
  slugSchema,
  statusSchema,
} from "@/lib/validation";

/*
 * Art Gallery vocabulary and form schemas. The lists mirror the checks in
 * supabase/migrations/20261121000100_art_gallery.sql; keep them in sync.
 */

// ---------------------------------------------------------------------------
// Fixed lists
// ---------------------------------------------------------------------------

export const DISCIPLINES = {
  painting: "Painting",
  sculpture: "Sculpture",
  installation: "Installation",
  visionary: "Visionary art",
  psychedelic: "Psychedelic art",
  digital: "Digital art",
  live_painting: "Live painting",
  multimedia: "Multimedia",
  photography: "Photography",
  textile: "Textile & fibre",
  light: "Light art",
  mural: "Murals",
  projection: "Projection mapping",
} as const;

export type Discipline = keyof typeof DISCIPLINES;
export const DISCIPLINE_KEYS = Object.keys(DISCIPLINES) as Discipline[];

export function isDiscipline(value: unknown): value is Discipline {
  return typeof value === "string" && value in DISCIPLINES;
}

export const disciplineLabels = (items: readonly string[]) =>
  items.filter(isDiscipline).map((item) => DISCIPLINES[item]);

/** Roles an artist can hold in one exhibition, in display order. */
export const ROLES = {
  curator: { label: "Curator", group: "Curated by" },
  featured: { label: "Featured artist", group: "Featured artists" },
  installation: { label: "Installation artist", group: "Installations" },
  live_painter: { label: "Live painter", group: "Live painting" },
  artist: { label: "Exhibiting artist", group: "Exhibiting artists" },
  collaborator: { label: "Collaborator", group: "Collaborators" },
  guest: { label: "Guest artist", group: "Guest artists" },
  technical: { label: "Technical & build", group: "Build & technical" },
} as const;

export type Role = keyof typeof ROLES;
export const ROLE_KEYS = Object.keys(ROLES) as Role[];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && value in ROLES;
}

export const roleLabels = (items: readonly string[]) =>
  items.filter(isRole).map((item) => ROLES[item].label);

/** Curated sets for exhibition photography; `logo` is for partner logos. */
export const COLLECTIONS: Record<ArtCollection, string> = {
  installation: "Installations & environments",
  closeup: "Artwork close-ups",
  atmosphere: "Festival atmosphere",
  process: "Behind the scenes",
  logo: "Partner logo",
};
export const PHOTO_COLLECTIONS = [
  "installation",
  "closeup",
  "atmosphere",
  "process",
] as const satisfies readonly ArtCollection[];

export const ARTIST_KINDS: Record<ArtArtistKind, string> = {
  individual: "Individual artist",
  collective: "Collective",
};

export const ART_LINK_PLATFORMS: Record<ArtLinkPlatform, string> = {
  website: "Website",
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  vimeo: "Vimeo",
  tiktok: "TikTok",
  behance: "Behance",
  artstation: "ArtStation",
  x: "X",
  linkedin: "LinkedIn",
  other: "Other",
};

export const PARTNER_KINDS: Record<ArtPartnerKind, string> = {
  partner: "Partner",
  sponsor: "Sponsor",
  supporter: "Supported by",
  media: "Media partner",
};

// ---------------------------------------------------------------------------
// Exhibition timing: derived from dates, never stored
// ---------------------------------------------------------------------------

export type Timing = "upcoming" | "current" | "past";

export const TIMING_LABELS: Record<Timing, string> = {
  current: "Now on view",
  upcoming: "Upcoming",
  past: "Archive",
};

/** Today as YYYY-MM-DD in UTC; exhibitions are compared by calendar date. */
export const todayIso = (now = new Date()) => now.toISOString().slice(0, 10);

export function exhibitionTiming(
  startsOn: string | null,
  endsOn: string | null,
  today = todayIso(),
): Timing {
  if (!startsOn || startsOn > today) return "upcoming";
  return (endsOn ?? startsOn) >= today ? "current" : "past";
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "4–9 Jul 2027", "28 Jun – 3 Jul 2027", "Dates to be announced". */
export function formatDateRange(
  startsOn: string | null,
  endsOn: string | null,
  note?: string | null,
) {
  if (!startsOn) return note || "Dates to be announced";
  const [y1, m1, d1] = startsOn.split("-").map(Number);
  const end = endsOn && endsOn !== startsOn ? endsOn : null;
  if (!end) return `${d1} ${MONTHS[m1 - 1]} ${y1}`;
  const [y2, m2, d2] = end.split("-").map(Number);
  if (y1 !== y2) {
    return `${d1} ${MONTHS[m1 - 1]} ${y1} – ${d2} ${MONTHS[m2 - 1]} ${y2}`;
  }
  if (m1 !== m2) {
    return `${d1} ${MONTHS[m1 - 1]} – ${d2} ${MONTHS[m2 - 1]} ${y2}`;
  }
  return `${d1}–${d2} ${MONTHS[m1 - 1]} ${y1}`;
}

const trimNumber = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

/** "120 × 90 cm", "Ø 3 m" style: height × width × depth, the museum order. */
export function formatDimensions(work: {
  width_cm?: number | null;
  height_cm?: number | null;
  depth_cm?: number | null;
  dimensions_note?: string | null;
}) {
  const parts = [work.height_cm, work.width_cm, work.depth_cm]
    .filter((value): value is number => typeof value === "number")
    .map((value) => trimNumber(Number(value)));
  const size = parts.length ? `${parts.join(" × ")} cm` : "";
  return [size, work.dimensions_note].filter(Boolean).join(", ") || null;
}

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------

const sortOrder = z.coerce
  .number()
  .int("Use a whole number.")
  .min(-1000)
  .max(1000);

const autoSlug = z.string().trim().optional();

export const createArtArtistSchema = z
  .object({
    name: requiredText("artist name", 120),
    slug: autoSlug,
    kind: z.enum(["individual", "collective"]).optional(),
  })
  .transform((data) => ({
    name: data.name,
    slug: data.slug || slugify(data.name),
    kind: (data.kind ?? "individual") as ArtArtistKind,
  }))
  .pipe(
    z.object({
      name: z.string(),
      slug: slugSchema,
      kind: z.enum(["individual", "collective"]),
    }),
  );

const titled = (label: string) =>
  z
    .object({ title: requiredText(label, 160), slug: autoSlug })
    .transform((data) => ({
      title: data.title,
      slug: data.slug || slugify(data.title),
    }))
    .pipe(z.object({ title: z.string(), slug: slugSchema }));

export const createArtExhibitionSchema = titled("exhibition title");
export const createArtworkSchema = titled("artwork title");

export const artArtistDetailsSchema = z.object({
  name: requiredText("artist name", 120),
  stage_name: optionalText(120),
  slug: slugSchema,
  kind: z.enum(["individual", "collective"]),
  tagline: optionalText(160),
  disciplines: z
    .array(z.enum(DISCIPLINE_KEYS as [Discipline, ...Discipline[]]))
    .max(8, "Choose up to 8 disciplines."),
  specialization: optionalText(160),
  country: countrySchema,
  based_in: optionalText(80),
  bio: optionalText(8000),
  statement: optionalText(3000),
  techniques: optionalText(2000),
  website_url: optionalHttpsUrl,
  inquiries_enabled: checkboxSchema,
  music_artist_id: optionalUuid,
  status: statusSchema,
  featured: checkboxSchema,
  sort_order: sortOrder,
  seo_title: optionalText(70),
  seo_description: optionalText(200),
});

export const artLinksSchema = z
  .array(
    z.object({
      platform: z.enum(
        Object.keys(ART_LINK_PLATFORMS) as [
          ArtLinkPlatform,
          ...ArtLinkPlatform[],
        ],
      ),
      url: z
        .url({ protocol: /^https$/, error: "Use a full https:// link." })
        .max(500),
    }),
  )
  .max(16, "Add at most 16 links.");

const isoDate = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "Choose a date.",
  })
  .transform((value) => (value === "" ? null : value));

export const artExhibitionDetailsSchema = z
  .object({
    title: requiredText("exhibition title", 160),
    subtitle: optionalText(200),
    slug: slugSchema,
    festival_id: optionalUuid,
    event_id: optionalUuid,
    venue_name: optionalText(160),
    city: optionalText(80),
    country: countrySchema,
    starts_on: isoDate,
    ends_on: isoDate,
    date_note: optionalText(80),
    summary: optionalText(300),
    overview: optionalText(8000),
    concept: optionalText(4000),
    accent_color: z
      .string()
      .trim()
      .refine((value) => value === "" || /^#[0-9a-fA-F]{6}$/.test(value), {
        message: "Use a colour like #FFB13B.",
      })
      .transform((value) => (value === "" ? null : value.toLowerCase())),
    external_url: optionalHttpsUrl,
    status: statusSchema,
    featured: checkboxSchema,
    sort_order: sortOrder,
    seo_title: optionalText(70),
    seo_description: optionalText(200),
  })
  .refine((data) => !data.ends_on || data.starts_on, {
    message: "Add the start date first.",
    path: ["ends_on"],
  })
  .refine(
    (data) =>
      !data.ends_on || !data.starts_on || data.ends_on >= data.starts_on,
    { message: "The end must be on or after the start.", path: ["ends_on"] },
  );

const optionalCm = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : Number(value.replace(",", "."))))
  .refine(
    (value) =>
      value === null ||
      (Number.isFinite(value) && value > 0 && value < 1_000_000),
    { message: "Use a number of centimetres, e.g. 120 or 85.5." },
  )
  .transform((value) => (value === null ? null : Math.round(value * 10) / 10));

export const artworkDetailsSchema = z.object({
  title: requiredText("artwork title", 160),
  slug: slugSchema,
  year: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : Number(value)))
    .refine(
      (value) =>
        value === null ||
        (Number.isInteger(value) && value >= 1900 && value <= 2100),
      { message: "Use a year like 2026." },
    ),
  discipline: z
    .string()
    .refine((value) => value === "" || isDiscipline(value), {
      message: "Choose a discipline.",
    })
    .transform((value) => (value === "" ? null : value)),
  medium: optionalText(160),
  width_cm: optionalCm,
  height_cm: optionalCm,
  depth_cm: optionalCm,
  dimensions_note: optionalText(120),
  description: optionalText(4000),
  status: statusSchema,
  featured: checkboxSchema,
  sort_order: sortOrder,
});

export const festivalSchema = z
  .object({
    name: requiredText("festival name", 160),
    slug: z.string().trim().optional(),
    city: optionalText(80),
    country: countrySchema,
    website_url: optionalHttpsUrl,
    description: optionalText(2000),
    sort_order: sortOrder.optional().default(0),
  })
  .transform((data) => ({
    ...data,
    slug: data.slug ? data.slug : slugify(data.name),
  }))
  .pipe(
    z.object({
      name: z.string(),
      slug: slugSchema,
      city: z.string().nullable(),
      country: z.string().nullable(),
      website_url: z.string().nullable(),
      description: z.string().nullable(),
      sort_order: z.number(),
    }),
  );

/** One participant row in the exhibition editor. */
export const participantsSchema = z
  .array(
    z.object({
      art_artist_id: z.uuid("Choose an artist."),
      roles: z
        .array(z.enum(ROLE_KEYS as [Role, ...Role[]]))
        .min(1, "Choose at least one role.")
        .max(4, "Choose up to 4 roles."),
      note: optionalText(200),
    }),
  )
  .max(120, "Add at most 120 artists.")
  .refine(
    (rows) =>
      new Set(rows.map((row) => row.art_artist_id)).size === rows.length,
    { message: "Each artist can be listed once; give them several roles." },
  );

export const creditsSchema = z
  .array(
    z.object({
      art_artist_id: z.uuid("Choose an artist."),
      credit: optionalText(80),
    }),
  )
  .min(1, "Credit at least one artist.")
  .max(24, "Credit at most 24 artists.")
  .refine(
    (rows) =>
      new Set(rows.map((row) => row.art_artist_id)).size === rows.length,
    { message: "The same artist is credited twice." },
  );

export const membersSchema = z
  .array(z.object({ member_id: z.uuid(), note: optionalText(80) }))
  .max(60, "Add at most 60 members.")
  .refine(
    (rows) => new Set(rows.map((row) => row.member_id)).size === rows.length,
    { message: "The same artist is listed twice." },
  );

export const partnersSchema = z
  .array(
    z.object({
      name: requiredText("partner name", 120),
      kind: z.enum(
        Object.keys(PARTNER_KINDS) as [ArtPartnerKind, ...ArtPartnerKind[]],
      ),
      url: optionalHttpsUrl,
      logo_asset_id: optionalUuid,
    }),
  )
  .max(40, "Add at most 40 partners.");

export const idListSchema = z
  .array(z.uuid())
  .max(400)
  .transform((ids) => [...new Set(ids)]);
