import "server-only";
import { requirePermission } from "@/lib/auth/permissions";
import { utcToZonedInput } from "@/lib/datetime";
import type { ContentStatus, PostRow } from "@/lib/supabase/database.types";
import { isMissingSchema } from "@/lib/supabase/schema-errors";
import { createClient } from "@/lib/supabase/server";
import { listLibraryImages } from "@/modules/cms/admin-queries";
import { listLibraryFiles } from "@/modules/media/library-server";
import { buildPostDetail, DETAIL_COLUMNS } from "./queries";
import { POST_TIME_ZONE } from "./schemas";

const UUID = /^[0-9a-f-]{36}$/i;

export type PostListFilter = {
  q?: string;
  status?: ContentStatus | "scheduled";
  category?: string;
};

/** Posts for the admin table; null when the posts table doesn't exist yet. */
export async function listPostsForAdmin(filter: PostListFilter = {}) {
  await requirePermission("content.manage", "/admin/posts");
  const supabase = await createClient();
  let query = supabase
    .from("posts")
    .select(
      "id, slug, title, status, featured, category, published_at, updated_at, is_demo",
    )
    .order("updated_at", { ascending: false })
    .limit(300);
  const now = new Date().toISOString();
  if (filter.status === "scheduled") {
    query = query.eq("status", "published").gt("published_at", now);
  } else if (filter.status) {
    query = query.eq("status", filter.status);
  }
  if (filter.category) query = query.eq("category", filter.category);
  const term = filter.q
    ?.replace(/[%_,().*\\"]/g, " ")
    .trim()
    .slice(0, 80);
  if (term) query = query.ilike("title", `%${term}%`);
  const { data, error } = await query;
  if (isMissingSchema(error)) return null;
  if (error) throw new Error(`Failed to load posts: ${error.message}`);
  return data.map((row) => ({
    ...row,
    scheduled:
      row.status === "published" &&
      !!row.published_at &&
      row.published_at > now,
  }));
}

/** Choices for the post form: artists, events, cover photos, embeddable files. */
export async function getPostFormOptions() {
  const supabase = await createClient();
  const [artists, events, images, files] = await Promise.all([
    supabase
      .from("artists")
      .select("id, stage_name")
      .neq("status", "archived")
      .order("stage_name"),
    supabase
      .from("events")
      .select("id, title, starts_at")
      .neq("status", "archived")
      .order("starts_at", { ascending: false })
      .limit(200),
    listLibraryImages(),
    listLibraryFiles(["image", "video", "audio", "document"]),
  ]);
  return {
    artists: artists.data ?? [],
    events: events.data ?? [],
    images,
    files: files.map((file) => ({
      id: file.id,
      kind: file.kind,
      title: file.title,
      url: file.url,
    })),
  };
}

export type PostForEdit = PostRow & { publishedAtInput: string };

export async function getPostForAdmin(id: string): Promise<PostForEdit | null> {
  await requirePermission("content.manage", `/admin/posts/${id}`);
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return {
    ...data,
    publishedAtInput: utcToZonedInput(data.published_at, POST_TIME_ZONE),
  };
}

/** The post as visitors will see it, drafts included (staff only). */
export async function getPostPreview(id: string) {
  await requirePermission("content.manage", `/admin/posts/${id}/preview`);
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select(`${DETAIL_COLUMNS}, status`)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const live =
    data.status === "published" &&
    !!data.published_at &&
    data.published_at <= new Date().toISOString();
  return { detail: await buildPostDetail(supabase, data), live };
}
