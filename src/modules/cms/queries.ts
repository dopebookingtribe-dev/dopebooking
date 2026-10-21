import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { publicObjectUrl } from "@/lib/media";
import { createPublicClient } from "@/lib/supabase/public";
import { DEFAULT_PAGES, DEFAULT_SETTINGS, type PageKey } from "./pages";
import {
  parsePageContent,
  parseSettings,
  type PageContent,
  type SiteSettings,
} from "./schema";

export const pageTag = (key: string) => `page:${key}`;
export const SETTINGS_TAG = "site-settings";
export const MEDIA_TAG = "media";

export type CmsImage = {
  id: string;
  url: string;
  alt: string;
  credit: string | null;
  width: number;
  height: number;
  /** CSS object-position from the focal point chosen in the media library. */
  position: string;
};

/**
 * The live version of a page. Falls back to the built-in defaults when the
 * page was never published, or when stored content no longer validates, so
 * the public site never renders empty or broken.
 */
export async function getPublishedPage(key: PageKey): Promise<PageContent> {
  "use cache";
  cacheLife("hours");
  cacheTag(pageTag(key));

  const { data, error } = await createPublicClient().rpc("get_published_page", {
    p_key: key,
  });
  if (error || data === null || data === undefined) return DEFAULT_PAGES[key];
  const parsed = parsePageContent(data);
  if (!parsed.success) {
    console.error(`Published page "${key}" failed validation; using defaults.`);
    return DEFAULT_PAGES[key];
  }
  return parsed.data;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  "use cache";
  cacheLife("hours");
  cacheTag(SETTINGS_TAG);

  const { data, error } = await createPublicClient().rpc(
    "get_published_settings",
  );
  if (error || data === null || data === undefined) return DEFAULT_SETTINGS;
  const parsed = parseSettings(data);
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

/** Public images by id, in one query. Unknown or private ids are skipped. */
export async function getImagesByIds(
  ids: string[],
): Promise<Record<string, CmsImage>> {
  "use cache";
  cacheLife("hours");
  cacheTag(MEDIA_TAG);

  const unique = [...new Set(ids.filter(Boolean))].sort();
  if (!unique.length) return {};
  const { data, error } = await createPublicClient()
    .from("media_assets")
    .select(
      "id, storage_bucket, storage_path, alt_text, credit, width, height, focal_x, focal_y",
    )
    .in("id", unique);
  if (error || !data) return {};

  return Object.fromEntries(
    data.map((row) => [
      row.id,
      {
        id: row.id,
        url: publicObjectUrl(row.storage_bucket, row.storage_path),
        alt: row.alt_text,
        credit: row.credit,
        width: row.width ?? 1600,
        height: row.height ?? 1000,
        position: `${row.focal_x ?? 50}% ${row.focal_y ?? 50}%`,
      } satisfies CmsImage,
    ]),
  );
}

/** Every image id a page refers to, so they load in a single query. */
export function collectImageIds(page: PageContent): string[] {
  const ids: string[] = [page.seo.image];
  for (const section of page.sections) {
    switch (section.type) {
      case "hero":
      case "cta":
      case "editorial":
        ids.push(section.content.image);
        break;
      case "gallery":
        ids.push(...section.content.images);
        break;
      case "services":
        ids.push(...section.content.items.map((item) => item.image));
        break;
      case "portfolio":
        ids.push(...section.content.items.map((item) => item.image));
        break;
    }
  }
  return ids.filter(Boolean);
}
