"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { staffClient } from "@/lib/auth/staff";
import {
  failedForm,
  formValues,
  invalidForm,
  savedForm,
  slugTakenForm,
  type FormState,
} from "@/lib/forms";
import {
  deleteOwnedImage,
  makeLeadImage,
  registerOwnedImage,
  type ImageResult,
  type RegisterImageInput,
} from "@/modules/media/server";
import { VIDEOS_TAG } from "./queries";
import { createVideoSchema, videoDetailsSchema } from "./schemas";

const path = (id?: string) => (id ? `/admin/videos/${id}` : "/admin/videos");

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

  const { data, error } = await supabase
    .from("videos")
    .insert({ ...parsed.data, created_by: user.id })
    .select("id")
    .single();
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

  const { error } = await supabase
    .from("videos")
    .update(parsed.data)
    .eq("id", videoId);
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
