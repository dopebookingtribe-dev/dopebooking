import "server-only";
import { publicObjectUrl } from "@/lib/media";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_PAGES,
  DEFAULT_SETTINGS,
  PAGE_KEYS,
  PAGES,
  type PageKey,
} from "./pages";
import {
  parsePageContent,
  parseSettings,
  type PageContent,
  type SiteSettings,
} from "./schema";

export type LibraryImage = {
  id: string;
  url: string;
  alt: string;
  credit: string | null;
  width: number;
  height: number;
  focalX: number;
  focalY: number;
  isDemo: boolean;
  createdAt: string;
};

type DraftState = {
  /** Never saved: the editor starts from the built-in defaults. */
  isNew: boolean;
  /** The saved draft differs from what visitors see. */
  hasUnpublished: boolean;
  /** The stored draft failed validation and was replaced by defaults. */
  recovered: boolean;
  publishedAt: string | null;
  draftUpdatedAt: string | null;
};

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

export async function getPageForEdit(
  key: PageKey,
): Promise<DraftState & { content: PageContent }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_pages")
    .select("draft, published, published_at, draft_updated_at")
    .eq("key", key)
    .maybeSingle();
  if (!data) {
    return {
      content: DEFAULT_PAGES[key],
      isNew: true,
      hasUnpublished: false,
      recovered: false,
      publishedAt: null,
      draftUpdatedAt: null,
    };
  }
  const parsed = parsePageContent(data.draft);
  return {
    content: parsed.success ? parsed.data : DEFAULT_PAGES[key],
    isNew: false,
    hasUnpublished: !same(data.draft, data.published),
    recovered: !parsed.success,
    publishedAt: data.published_at,
    draftUpdatedAt: data.draft_updated_at,
  };
}

/** Draft content for the preview route (staff only, via RLS). */
export async function getPageDraft(key: PageKey): Promise<PageContent> {
  return (await getPageForEdit(key)).content;
}

export async function listPagesForAdmin() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_pages")
    .select("key, draft, published, published_at, draft_updated_at");
  const rows = new Map((data ?? []).map((row) => [row.key, row]));
  return PAGE_KEYS.map((key) => {
    const row = rows.get(key);
    return {
      key,
      title: PAGES[key].title,
      path: PAGES[key].path,
      state: !row
        ? ("default" as const)
        : !row.published
          ? ("draft" as const)
          : same(row.draft, row.published)
            ? ("live" as const)
            : ("changes" as const),
      publishedAt: row?.published_at ?? null,
      draftUpdatedAt: row?.draft_updated_at ?? null,
    };
  });
}

export async function getSettingsForEdit(): Promise<
  DraftState & { settings: SiteSettings }
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("draft, published, published_at, draft_updated_at")
    .eq("id", 1)
    .maybeSingle();
  if (!data) {
    return {
      settings: DEFAULT_SETTINGS,
      isNew: true,
      hasUnpublished: false,
      recovered: false,
      publishedAt: null,
      draftUpdatedAt: null,
    };
  }
  const parsed = parseSettings(data.draft);
  return {
    settings: parsed.success ? parsed.data : DEFAULT_SETTINGS,
    isNew: false,
    hasUnpublished: !same(data.draft, data.published),
    recovered: !parsed.success,
    publishedAt: data.published_at,
    draftUpdatedAt: data.draft_updated_at,
  };
}

export async function listLibraryImages(): Promise<LibraryImage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("media_assets")
    .select(
      "id, storage_bucket, storage_path, alt_text, credit, width, height, focal_x, focal_y, is_demo, created_at",
    )
    .eq("library", "site")
    .order("created_at", { ascending: false });
  return (data ?? []).map((row) => ({
    id: row.id,
    url: publicObjectUrl(row.storage_bucket, row.storage_path),
    alt: row.alt_text,
    credit: row.credit,
    width: row.width ?? 1600,
    height: row.height ?? 1000,
    focalX: row.focal_x,
    focalY: row.focal_y,
    isDemo: row.is_demo,
    createdAt: row.created_at,
  }));
}

/** Choices the page builder offers: artists to pick, shop categories. */
export async function getBuilderOptions() {
  const supabase = await createClient();
  const [artists, categories] = await Promise.all([
    supabase
      .from("artists")
      .select("id, stage_name, status")
      .order("stage_name"),
    supabase.from("product_categories").select("slug, name").order("name"),
  ]);
  return {
    artists: (artists.data ?? []).map((artist) => ({
      id: artist.id,
      name: artist.stage_name,
      published: artist.status === "published",
    })),
    categories: categories.data ?? [],
  };
}
