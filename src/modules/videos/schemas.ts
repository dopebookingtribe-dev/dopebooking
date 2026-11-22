import { z } from "zod";
import type { VideoProvider } from "@/lib/supabase/database.types";
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

type Source = {
  provider: VideoProvider;
  provider_ref: string;
  file_asset_id?: string | null;
};

/**
 * Where the video plays from: a pasted link (YouTube, Vimeo, Mux,
 * Cloudflare Stream) or a file uploaded to the media library.
 * Link videos keep the shape they always had.
 */
const sourceFields = {
  source: z.enum(["link", "file"]).optional().default("link"),
  url: z.string().trim().optional().default(""),
  file_asset_id: z.string().trim().optional().default(""),
};

function resolveSource(
  data: { source: "link" | "file"; url: string; file_asset_id: string },
  ctx: z.RefinementCtx,
  clearFile: boolean,
): Source | typeof z.NEVER {
  if (data.source === "file") {
    if (!z.uuid().safeParse(data.file_asset_id).success) {
      ctx.addIssue({
        code: "custom",
        path: ["file_asset_id"],
        message: "Upload a video file or choose one from the library.",
      });
      return z.NEVER;
    }
    return {
      provider: "file",
      provider_ref: data.file_asset_id,
      file_asset_id: data.file_asset_id,
    };
  }
  if (!data.url) {
    ctx.addIssue({
      code: "custom",
      path: ["url"],
      message: "Paste the video link.",
    });
    return z.NEVER;
  }
  const parsed = parseVideoUrl(data.url);
  if (!parsed) {
    ctx.addIssue({
      code: "custom",
      path: ["url"],
      message:
        "Use a Mux, Cloudflare Stream, YouTube or Vimeo link (https://…).",
    });
    return z.NEVER;
  }
  return {
    provider: parsed.provider,
    provider_ref: parsed.ref,
    ...(clearFile ? { file_asset_id: null } : {}),
  };
}

export const createVideoSchema = z
  .object({ title, ...sourceFields })
  .transform(({ title, ...rest }, ctx) => {
    const slug = slugify(title);
    if (!slugSchema.safeParse(slug).success) {
      ctx.addIssue({
        code: "custom",
        path: ["title"],
        message: "Use letters or numbers in the title.",
      });
      return z.NEVER;
    }
    const source = resolveSource(rest, ctx, false);
    return { title, slug, ...source };
  });

export const videoDetailsSchema = z
  .object({
    title,
    slug: slugSchema,
    ...sourceFields,
    description: optionalText(4000),
    event_id: optionalUuid,
    artist_id: optionalUuid,
    status: statusSchema,
    featured: checkboxSchema,
    sort_order: z.coerce
      .number()
      .int("Use a whole number.")
      .min(0, "Use 0 or more.")
      .max(9999)
      .optional(),
  })
  .transform(({ source, url, file_asset_id, ...rest }, ctx) => ({
    ...rest,
    ...resolveSource({ source, url, file_asset_id }, ctx, true),
  }));
