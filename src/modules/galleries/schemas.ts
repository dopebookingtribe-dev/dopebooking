import { z } from "zod";
import {
  optionalText,
  optionalUuid,
  requiredText,
  slugify,
  slugSchema,
  statusSchema,
} from "@/lib/validation";

const title = requiredText("gallery name", 160);

export const createGallerySchema = z
  .object({ title })
  .transform((data, ctx) => {
    const slug = slugify(data.title);
    if (!slugSchema.safeParse(slug).success) {
      ctx.addIssue({
        code: "custom",
        path: ["title"],
        message: "Use letters or numbers in the name.",
      });
      return z.NEVER;
    }
    return { ...data, slug };
  });

export const galleryDetailsSchema = z.object({
  title,
  slug: slugSchema,
  description: optionalText(4000),
  event_id: optionalUuid,
  photographer: optionalText(120),
  status: statusSchema,
  seo_title: optionalText(70).default(null),
  seo_description: optionalText(200).default(null),
});
