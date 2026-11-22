import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { LEGAL_DOCS, legalKey, type LegalDoc } from "./docs";
import { legalContentSchema, type LegalContent } from "./schema";

export const legalTag = (doc: LegalDoc) => `legal:${doc}`;

/** The published edit of a legal page, or null to show the original page. */
export async function getPublishedLegal(
  doc: LegalDoc,
): Promise<LegalContent | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(legalTag(doc));
  const { data, error } = await createPublicClient().rpc("get_published_page", {
    p_key: legalKey(doc),
  });
  if (error || !data) return null;
  const parsed = legalContentSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

export function defaultLegal(doc: LegalDoc): LegalContent {
  const base = LEGAL_DOCS[doc];
  return {
    title: base.title,
    updated: base.updated,
    showDraftNotice: true,
    body: base.body,
  };
}

export async function getLegalForEdit(doc: LegalDoc) {
  await requirePermission("pages.edit", `/admin/legal/${doc}`);
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_pages")
    .select("draft, published, published_at, draft_updated_at")
    .eq("key", legalKey(doc))
    .maybeSingle();
  const draft = legalContentSchema.safeParse(data?.draft);
  const live = legalContentSchema.safeParse(data?.published);
  return {
    content: draft.success ? draft.data : defaultLegal(doc),
    isLive: live.success,
    hasUnpublished:
      Boolean(data) &&
      JSON.stringify(data?.draft) !== JSON.stringify(data?.published),
    publishedAt: data?.published_at ?? null,
    draftUpdatedAt: data?.draft_updated_at ?? null,
  };
}

/** Status of every legal page for the overview. */
export async function listLegalForAdmin() {
  await requirePermission("pages.edit", "/admin/legal");
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_pages")
    .select("key, draft, published, published_at")
    .like("key", "legal-%");
  const rows = new Map((data ?? []).map((row) => [row.key, row]));
  return (Object.keys(LEGAL_DOCS) as LegalDoc[]).map((doc) => {
    const row = rows.get(legalKey(doc));
    const content = legalContentSchema.safeParse(row?.draft);
    const body = content.success ? content.data.body : LEGAL_DOCS[doc].body;
    return {
      doc,
      title: LEGAL_DOCS[doc].title,
      path: LEGAL_DOCS[doc].path,
      edited: Boolean(row),
      live: Boolean(row?.published),
      unpublished:
        Boolean(row) &&
        JSON.stringify(row?.draft) !== JSON.stringify(row?.published),
      publishedAt: row?.published_at ?? null,
      placeholders: (body.match(/\[[A-Z][A-Z0-9 /…,.&-]*\]/g) ?? []).length,
    };
  });
}
