import { z } from "zod";
import { isTimeZone, zonedInputToUtc } from "@/lib/datetime";
import {
  checkboxSchema,
  countrySchema,
  optionalHttpsUrl,
  optionalText,
  requiredText,
  slugify,
  slugSchema,
  statusSchema,
} from "@/lib/validation";

const timeZone = z
  .string()
  .trim()
  .refine(isTimeZone, { message: "Choose a time zone." });

const localDateTime = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Enter a date and time.");

const optionalLocalDateTime = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value),
    { message: "Enter a date and time." },
  );

/** Converts the zone-local inputs to UTC, reporting bad dates per field. */
function withUtcTimes<
  T extends { starts_at: string; ends_at?: string; timezone: string },
>(data: T, ctx: z.RefinementCtx) {
  const startsAt = zonedInputToUtc(data.starts_at, data.timezone);
  if (!startsAt) {
    ctx.addIssue({
      code: "custom",
      path: ["starts_at"],
      message: "Enter a valid date.",
    });
    return z.NEVER;
  }
  let endsAt: string | null = null;
  if (data.ends_at) {
    endsAt = zonedInputToUtc(data.ends_at, data.timezone);
    if (!endsAt) {
      ctx.addIssue({
        code: "custom",
        path: ["ends_at"],
        message: "Enter a valid date.",
      });
      return z.NEVER;
    }
    if (endsAt < startsAt) {
      ctx.addIssue({
        code: "custom",
        path: ["ends_at"],
        message: "The end must be after the start.",
      });
      return z.NEVER;
    }
  }
  return { ...data, starts_at: startsAt, ends_at: endsAt };
}

export const createEventSchema = z
  .object({
    title: requiredText("event name", 160),
    starts_at: localDateTime,
    timezone: timeZone,
  })
  .transform((data, ctx) => {
    const converted = withUtcTimes(data, ctx);
    if (converted === z.NEVER) return z.NEVER;
    const slug = slugify(`${data.title} ${data.starts_at.slice(0, 4)}`);
    if (!slugSchema.safeParse(slug).success) {
      ctx.addIssue({
        code: "custom",
        path: ["title"],
        message: "Use letters or numbers in the name.",
      });
      return z.NEVER;
    }
    return { ...converted, slug };
  });

export const eventDetailsSchema = z
  .object({
    title: requiredText("event name", 160),
    slug: slugSchema,
    summary: optionalText(200),
    description: optionalText(8000),
    starts_at: localDateTime,
    ends_at: optionalLocalDateTime,
    timezone: timeZone,
    venue_name: optionalText(160),
    city: optionalText(80),
    country: countrySchema,
    ticket_url: optionalHttpsUrl,
    status: statusSchema,
    featured: checkboxSchema,
    seo_title: optionalText(70).default(null),
    seo_description: optionalText(200).default(null),
  })
  .transform(withUtcTimes);

export const lineupSchema = z
  .array(
    z.object({
      artist_id: z.uuid("Choose an artist."),
      stage: optionalText(80),
      set_starts_at: optionalLocalDateTime,
    }),
  )
  .max(100)
  .refine(
    (rows) => new Set(rows.map((row) => row.artist_id)).size === rows.length,
    { message: "An artist is listed twice." },
  );
