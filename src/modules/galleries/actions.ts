"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
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
  ownedMediaFiles,
  registerOwnedImage,
  removeStoredFiles,
  type ImageResult,
  type RegisterImageInput,
} from "@/modules/media/server";
import { GALLERIES_TAG } from "./queries";
import { createGallerySchema, galleryDetailsSchema } from "./schemas";

const path = (id?: string) =>
  id ? `/admin/galleries/${id}` : "/admin/galleries";

export async function createGallery(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user, supabase } = await staffClient(path());
  const parsed = createGallerySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);

  const { data, error } = await supabase
    .from("galleries")
    .insert({ ...parsed.data, created_by: user.id })
    .select("id")
    .single();
  if (error?.code === "23505") {
    return {
      status: "error",
      fieldErrors: { title: ["A gallery with this name exists already."] },
      values: formValues(formData),
    };
  }
  if (error) return failedForm(formData);
  redirect(path(data.id));
}

export async function updateGalleryDetails(
  galleryId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await staffClient(path(galleryId));
  const parsed = galleryDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);

  const { error } = await supabase
    .from("galleries")
    .update(parsed.data)
    .eq("id", galleryId);
  if (error?.code === "23505") return slugTakenForm(formData);
  if (error) return failedForm(formData);

  updateTag(GALLERIES_TAG);
  return savedForm(formData);
}

export async function registerGalleryImage(
  galleryId: string,
  input: RegisterImageInput,
): Promise<ImageResult> {
  const { user, supabase } = await staffClient(path(galleryId));
  const result = await registerOwnedImage(
    supabase,
    user.id,
    "gallery",
    galleryId,
    input,
  );
  if (result.ok) updateTag(GALLERIES_TAG);
  return result;
}

export async function setGalleryCover(galleryId: string, assetId: string) {
  const { supabase } = await staffClient(path(galleryId));
  if (await makeLeadImage(supabase, "gallery", galleryId, assetId)) {
    updateTag(GALLERIES_TAG);
  }
}

export async function deleteGalleryImage(galleryId: string, assetId: string) {
  const { supabase } = await staffClient(path(galleryId));
  if (await deleteOwnedImage(supabase, "gallery", galleryId, assetId)) {
    updateTag(GALLERIES_TAG);
  }
}

/**
 * Deletes the gallery and its photos (rows and stored files).
 * The event it belonged to is not affected.
 */
export async function deleteGallery(id: string): Promise<FormState> {
  await requirePermission("content.manage", path(id));
  const { supabase } = await staffClient(path(id));
  const files = await ownedMediaFiles(supabase, "gallery", id);
  const { error, count } = await supabase
    .from("galleries")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error || !count) {
    return {
      status: "error",
      message: "Could not delete it. Set the status to Archived instead.",
    };
  }
  await removeStoredFiles(supabase, files);
  updateTag(GALLERIES_TAG);
  redirect("/admin/galleries");
}
