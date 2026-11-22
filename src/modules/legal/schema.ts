import { z } from "zod";

export const legalContentSchema = z.object({
  title: z.string().trim().min(1, "Enter the page title.").max(120),
  updated: z.string().trim().max(40, "Use at most 40 characters."),
  showDraftNotice: z.boolean(),
  body: z
    .string()
    .trim()
    .min(1, "The page needs some text.")
    .max(40000, "The text is too long (40,000 characters max)."),
});

export type LegalContent = z.infer<typeof legalContentSchema>;
