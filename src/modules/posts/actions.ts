"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import {
  failedForm,
  formValues,
  invalidForm,
  savedForm,
  slugTakenForm,
  type FormState,
} from "@/lib/forms";
import type { ContentStatus } from "@/lib/supabase/database.types";
import {
  isMissingSchema,
  MIGRATION_NOTICE,
} from "@/lib/supabase/schema-errors";
import { createClient } from "@/lib/supabase/server";
import { POSTS_TAG } from "./queries";
import { createPostSchema, postSchema } from "./schemas";

const path = (id?: string) => (id ? `/admin/posts/${id}` : "/admin/posts");
const UUID = /^[0-9a-f-]{36}$/i;

async function editor(returnPath: string) {
  const { user } = await requirePermission("content.manage", returnPath);
  return { user, supabase: await createClient() };
}

export async function createPost(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user, supabase } = await editor(`${path()}/new`);
  const parsed = createPostSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);
  let postId: string | null = null;
  for (let attempt = 0; attempt < 6 && !postId; attempt++) {
    const slug =
      attempt === 0
        ? parsed.data.slug
        : `${parsed.data.slug.slice(0, 74)}-${attempt < 3 ? attempt + 1 : Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await supabase
      .from("posts")
      .insert({ title: parsed.data.title, slug, created_by: user.id })
      .select("id")
      .single();
    if (data) postId = data.id;
    else if (isMissingSchema(error)) {
      return {
        status: "error",
        message: MIGRATION_NOTICE,
        values: formValues(formData),
      };
    } else if (error?.code !== "23505") return failedForm(formData);
  }
  if (!postId) return failedForm(formData);
  redirect(path(postId));
}

export async function updatePost(
  postId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await editor(path(postId));
  if (!UUID.test(postId)) return failedForm(formData);
  const parsed = postSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);
  const data = parsed.data;
  // Publishing without a date publishes now (the database fills it in).
  const update = {
    ...data,
    published_at:
      data.published_at ??
      (data.status === "published" ? new Date().toISOString() : null),
  };
  const { error } = await supabase
    .from("posts")
    .update(update)
    .eq("id", postId);
  if (error?.code === "23505") return slugTakenForm(formData);
  if (error) return failedForm(formData);
  updateTag(POSTS_TAG);
  const scheduled =
    update.status === "published" &&
    update.published_at &&
    update.published_at > new Date().toISOString();
  return {
    ...savedForm(formData),
    message: scheduled
      ? "Saved. The post goes live at the scheduled time."
      : update.status === "published"
        ? "Saved and live."
        : "Saved.",
  };
}

/** One-click status change from the editor header or the list. */
export async function setPostStatus(postId: string, status: ContentStatus) {
  const { supabase } = await editor(path(postId));
  if (
    !UUID.test(postId) ||
    !["draft", "published", "archived"].includes(status)
  )
    return;
  const { data: post } = await supabase
    .from("posts")
    .select("published_at")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return;
  await supabase
    .from("posts")
    .update({
      status,
      ...(status === "published" && !post.published_at
        ? { published_at: new Date().toISOString() }
        : {}),
    })
    .eq("id", postId);
  updateTag(POSTS_TAG);
}

/** Deletes the post. Library photos and files it used stay in the library. */
export async function deletePost(postId: string): Promise<FormState> {
  const { supabase } = await editor(path(postId));
  if (!UUID.test(postId))
    return { status: "error", message: "Post not found." };
  const { error, count } = await supabase
    .from("posts")
    .delete({ count: "exact" })
    .eq("id", postId);
  if (error || !count)
    return { status: "error", message: "Could not delete the post." };
  updateTag(POSTS_TAG);
  redirect(path());
}
