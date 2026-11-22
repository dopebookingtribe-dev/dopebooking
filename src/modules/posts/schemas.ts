import { z } from "zod";
import { zonedInputToUtc } from "@/lib/datetime";
import {
  checkboxSchema,
  optionalText,
  optionalUuid,
  requiredText,
  slugify,
  slugSchema,
  statusSchema,
} from "@/lib/validation";

/** Publication times are entered and shown in the agency's own zone. */
export const POST_TIME_ZONE = "Europe/Berlin";

export const POST_CATEGORIES = [
  "News",
  "Announcements",
  "Interviews",
  "Festival reports",
  "Releases",
  "Behind the scenes",
] as const;

const title = requiredText("post title", 160);

export const createPostSchema = z
  .object({ title })
  .transform(({ title }, ctx) => {
    const slug = slugify(title);
    if (!slugSchema.safeParse(slug).success) {
      ctx.addIssue({
        code: "custom",
        path: ["title"],
        message: "Use letters or numbers in the title.",
      });
      return z.NEVER;
    }
    return { title, slug };
  });

/** "psytrance, Boom 2026 ,  interview" → ["psytrance", "boom 2026", "interview"] */
export function parseTags(input: string): string[] {
  return [
    ...new Set(
      input
        .split(",")
        .map((tag) => tag.trim().toLowerCase().replace(/\s+/g, " "))
        .filter(Boolean),
    ),
  ];
}

const tagsSchema = z
  .string()
  .max(400)
  .transform((value) => parseTags(value))
  .refine((tags) => tags.length <= 10, "Use up to 10 tags.")
  .refine(
    (tags) => tags.every((tag) => tag.length <= 30),
    "Keep each tag under 30 characters.",
  );

const publishedAtSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (!value) return null;
    const utc = zonedInputToUtc(value, POST_TIME_ZONE);
    if (!utc) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date and time." });
      return z.NEVER;
    }
    return utc;
  });

export const postSchema = z.object({
  title,
  slug: slugSchema,
  excerpt: optionalText(400),
  body: z.string().max(40000, "The text is too long (40,000 characters max)."),
  category: optionalText(40),
  tags: tagsSchema,
  author_name: optionalText(80),
  cover_asset_id: optionalUuid,
  artist_id: optionalUuid,
  event_id: optionalUuid,
  status: statusSchema,
  featured: checkboxSchema,
  sort_order: z.coerce.number().int().min(0).max(9999).default(0),
  published_at: publishedAtSchema,
  seo_title: optionalText(70),
  seo_description: optionalText(200),
});

export type PostInput = z.output<typeof postSchema>;
