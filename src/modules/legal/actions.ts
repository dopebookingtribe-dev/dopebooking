"use server";

import { updateTag } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { isLegalDoc, LEGAL_DOCS, legalKey, type LegalDoc } from "./docs";
import { legalTag } from "./queries";
import { legalContentSchema } from "./schema";

export type LegalResult = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
  at?: string;
} | null;

function read(formData: FormData) {
  return legalContentSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    updated: String(formData.get("updated") ?? ""),
    showDraftNotice: formData.get("showDraftNotice") === "on",
    body: String(formData.get("body") ?? ""),
  });
}

async function writeDraft(
  doc: LegalDoc,
  formData: FormData,
): Promise<LegalResult> {
  await requirePermission("pages.edit", `/admin/legal/${doc}`);
  const parsed = read(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues)
      fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, message: "Some fields need attention.", fieldErrors };
  }
  const supabase = await createClient();
  const key = legalKey(doc);
  const { data: existing } = await supabase
    .from("site_pages")
    .select("key")
    .eq("key", key)
    .maybeSingle();
  const { error } = existing
    ? await supabase
        .from("site_pages")
        .update({ draft: parsed.data })
        .eq("key", key)
    : await supabase.from("site_pages").insert({
        key,
        title: `Legal: ${LEGAL_DOCS[doc].title}`.slice(0, 120),
        draft: parsed.data,
      });
  if (error) return { ok: false, message: "Saving failed. Please try again." };
  return {
    ok: true,
    message: "Draft saved. Publish to show it on the site.",
    at: new Date().toISOString(),
  };
}

/** Saves the draft, or saves and publishes with intent=publish. */
export async function saveLegal(
  doc: string,
  _prev: LegalResult,
  formData: FormData,
): Promise<LegalResult> {
  if (!isLegalDoc(doc)) return { ok: false, message: "Unknown page." };
  const saved = await writeDraft(doc, formData);
  if (!saved?.ok || formData.get("intent") !== "publish") return saved;
  await requirePermission("pages.publish", `/admin/legal/${doc}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_site_page", {
    p_key: legalKey(doc),
  });
  if (error)
    return { ok: false, message: "Publishing failed. Your draft is saved." };
  updateTag(legalTag(doc));
  return {
    ok: true,
    message: "Published. Visitors now see this version.",
    at: new Date().toISOString(),
  };
}

/** Back to the original built-in page: removes the edited version. */
export async function revertLegal(doc: string): Promise<LegalResult> {
  if (!isLegalDoc(doc)) return { ok: false, message: "Unknown page." };
  await requirePermission("pages.publish", `/admin/legal/${doc}`);
  const supabase = await createClient();
  const { error } = await supabase
    .from("site_pages")
    .delete()
    .eq("key", legalKey(doc));
  if (error)
    return {
      ok: false,
      message: "Only super admins can remove a published page.",
    };
  updateTag(legalTag(doc));
  return {
    ok: true,
    message: "Removed. The original page shows again.",
    at: new Date().toISOString(),
  };
}
