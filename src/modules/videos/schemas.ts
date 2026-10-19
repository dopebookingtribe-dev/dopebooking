import { z } from "zod";
import { parseVideoUrl } from "@/lib/video";
import {
  checkboxSchema,
  optionalText,
  optionalUuid,
  requiredText,
  slugify,
  slugSchema,
  statusSchema,
} from "@/lib/validation";

const title = requiredText("video title", 160);

/** A pasted link becomes { provider, provider_ref }. */
const videoUrl = z
  .string()
  .trim()
  .min(1, "Paste the video link.")
  .transform((value, ctx) => {
    const source = parseVideoUrl(value);
    if (!source) {
      ctx.addIssue({
        code: "custom",
        message:
          "Use a Mux, Cloudflare Stream, YouTube or Vimeo link (https://…).",
      });
      return z.NEVER;
    }
    return { provider: source.provider, provider_ref: source.ref };
  });

export const createVideoSchema = z
  .object({ title, url: videoUrl })
  .transform(({ title, url }, ctx) => {
    const slug = slugify(title);
    if (!slugSchema.safeParse(slug).success) {
      ctx.addIssue({
        code: "custom",
        path: ["title"],
        message: "Use letters or numbers in the title.",
      });
      return z.NEVER;
    }
    return { title, slug, ...url };
  });

export const videoDetailsSchema = z
  .object({
    title,
    slug: slugSchema,
    url: videoUrl,
    description: optionalText(4000),
    event_id: optionalUuid,
    artist_id: optionalUuid,
    status: statusSchema,
    featured: checkboxSchema,
  })
  .transform(({ url, ...rest }) => ({ ...rest, ...url }));
