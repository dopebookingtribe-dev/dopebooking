"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { staffClient } from "@/lib/auth/staff";
import {
  isMissingSchema,
  MIGRATION_NOTICE,
} from "@/lib/supabase/schema-errors";
import {
  failedForm,
  formValues,
  invalidForm,
  savedForm,
  slugTakenForm,
  type FormState,
} from "@/lib/forms";
import { getLibraryUsage } from "@/modules/media/library-server";
import {
  deleteOwnedImage,
  makeLeadImage,
  ownedMediaFiles,
  registerOwnedImage,
  removeStoredFiles,
  type ImageResult,
  type RegisterImageInput,
} from "@/modules/media/server";
import { VIDEOS_TAG } from "./queries";
import { createVideoSchema, videoDetailsSchema } from "./schemas";

const path = (id?: string) => (id ? `/admin/videos/${id}` : "/admin/videos");

/** The id must be a video file in the shared media library. */
async function isLibraryVideo(
  supabase: Awaited<ReturnType<typeof staffClient>>["supabase"],
  assetId: string,
) {
  const { data } = await supabase
    .from("media_assets")
    .select("id")
    .eq("id", assetId)
    .eq("type", "video")
    .not("library", "is", null)
    .maybeSingle();
  return Boolean(data);
}

function duplicateVideo(formData: FormData): FormState {
  return {
    status: "error",
    fieldErrors: { url: ["This video has been added already."] },
    values: formValues(formData),
  };
}

export async function createVideo(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user, supabase } = await staffClient(path());
  const parsed = createVideoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);
  if (
    parsed.data.file_asset_id &&
    !(await isLibraryVideo(supabase, parsed.data.file_asset_id))
  ) {
    return {
      status: "error",
      fieldErrors: { file_asset_id: ["Choose a video file from the library."] },
      values: formValues(formData),
    };
  }

  const { data, error } = await supabase
    .from("videos")
    .insert({ ...parsed.data, created_by: user.id })
    .select("id")
    .single();
  if (isMissingSchema(error) || error?.code === "22P02") {
    return {
      status: "error",
      message: MIGRATION_NOTICE,
      values: formValues(formData),
    };
  }
  if (error?.code === "23505") {
    return error.message.includes("slug")
      ? {
          status: "error",
          fieldErrors: { title: ["A video with this title exists already."] },
          values: formValues(formData),
        }
      : duplicateVideo(formData);
  }
  if (error) return failedForm(formData);
  redirect(path(data.id));
}

export async function updateVideoDetails(
  videoId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await staffClient(path(videoId));
  const parsed = videoDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);
  if (
    parsed.data.file_asset_id &&
    !(await isLibraryVideo(supabase, parsed.data.file_asset_id))
  ) {
    return {
      status: "error",
      fieldErrors: { file_asset_id: ["Choose a video file from the library."] },
      values: formValues(formData),
    };
  }

  let { error } = await supabase
    .from("videos")
    .update(parsed.data)
    .eq("id", videoId);
  if (isMissingSchema(error) && parsed.data.provider !== "file") {
    // Before the database update: save without order and file columns.
    const legacy: Partial<typeof parsed.data> = { ...parsed.data };
    delete legacy.file_asset_id;
    delete legacy.sort_order;
    ({ error } = await supabase
      .from("videos")
      .update(legacy)
      .eq("id", videoId));
  }
  if (error?.code === "23505") {
    return error.message.includes("slug")
      ? slugTakenForm(formData)
      : duplicateVideo(formData);
  }
  if (error) return failedForm(formData);

  updateTag(VIDEOS_TAG);
  return savedForm(formData);
}

export async function registerVideoPoster(
  videoId: string,
  input: RegisterImageInput,
): Promise<ImageResult> {
  const { user, supabase } = await staffClient(path(videoId));
  const result = await registerOwnedImage(
    supabase,
    user.id,
    "video",
    videoId,
    input,
  );
  if (result.ok) updateTag(VIDEOS_TAG);
  return result;
}

export async function setVideoPoster(videoId: string, assetId: string) {
  const { supabase } = await staffClient(path(videoId));
  if (await makeLeadImage(supabase, "video", videoId, assetId)) {
    updateTag(VIDEOS_TAG);
  }
}

export async function deleteVideoImage(videoId: string, assetId: string) {
  const { supabase } = await staffClient(path(videoId));
  if (await deleteOwnedImage(supabase, "video", videoId, assetId)) {
    updateTag(VIDEOS_TAG);
  }
}

/**
 * Deletes a video and its poster images. With "delete_file", the uploaded
 * video file is removed from the library too, unless something else uses it.
 */
export async function deleteVideo(
  videoId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePermission("content.manage", path(videoId));
  const { supabase } = await staffClient(path(videoId));
  // "*" so this also works before the file_asset_id column exists.
  const { data: video } = await supabase
    .from("videos")
    .select("*")
    .eq("id", videoId)
    .maybeSingle();
  if (!video) return { status: "error", message: "Video not found." };
  const posters = await ownedMediaFiles(supabase, "video", videoId);

  const { error, count } = await supabase
    .from("videos")
    .delete({ count: "exact" })
    .eq("id", videoId);
  if (error || !count) {
    return {
      status: "error",
      message: "Could not delete the video. Archive it instead.",
    };
  }
  await removeStoredFiles(supabase, posters);

  const fileId = (video as { file_asset_id?: string | null }).file_asset_id;
  if (fileId && formData.get("delete_file") === "on") {
    const stillUsed = (await getLibraryUsage()).get(fileId)?.length;
    if (!stillUsed) {
      const { data: file } = await supabase
        .from("media_assets")
        .select("storage_bucket, storage_path")
        .eq("id", fileId)
        .maybeSingle();
      const { error: fileError } = await supabase
        .from("media_assets")
        .delete()
        .eq("id", fileId);
      if (file && !fileError) await removeStoredFiles(supabase, [file]);
    }
  }
  updateTag(VIDEOS_TAG);
  redirect("/admin/videos");
}
