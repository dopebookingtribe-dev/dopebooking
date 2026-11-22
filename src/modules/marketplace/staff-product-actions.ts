"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/permissions";
import {
  failedForm,
  formValues,
  invalidForm,
  savedForm,
  type FormState,
} from "@/lib/forms";
import {
  isMissingSchema,
  MIGRATION_NOTICE,
} from "@/lib/supabase/schema-errors";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/validation";
import {
  deleteOwnedImage,
  makeLeadImage,
  ownedMediaFiles,
  registerOwnedImage,
  removeStoredFiles,
  type ImageResult,
  type RegisterImageInput,
} from "@/modules/media/server";
import {
  VARIANT_FIELDS,
  writeProductDetails,
  writeVariants,
} from "./product-core";
import { SHOP_TAG } from "./queries";
import {
  createProductSchema,
  productDetailsSchema,
  SHOP_CURRENCY,
} from "./schemas";

// Admin product management. Every action checks content.manage here; the
// database policies "products: staff create/delete" and "variants: staff
// manage" (migration 20261122000100) enforce the same.

const DIGITAL_BUCKET = "digital-goods";
const UUID = /^[0-9a-f-]{36}$/i;
const path = (id?: string) =>
  id ? `/admin/products/${id}` : "/admin/products";

async function staff(returnPath: string) {
  const { user } = await requirePermission("content.manage", returnPath);
  return { user, supabase: await createClient() };
}

const createSchema = z
  .object({ seller_id: z.uuid("Choose the shop that sells it.") })
  .and(createProductSchema);

export async function createProductAsStaff(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await staff(`${path()}/new`);
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);
  const { seller_id, title, product_type, price } = parsed.data;

  const { data: seller } = await supabase
    .from("sellers")
    .select("id, status")
    .eq("id", seller_id)
    .maybeSingle();
  if (!seller || seller.status !== "approved") {
    return {
      status: "error",
      fieldErrors: { seller_id: ["Choose an approved shop."] },
      values: formValues(formData),
    };
  }

  let productId: string | null = null;
  const base = slugify(title) || "product";
  for (let attempt = 0; attempt < 6 && !productId; attempt++) {
    const slug =
      attempt === 0
        ? base
        : `${base.slice(0, 80)}-${attempt < 3 ? attempt + 1 : Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await supabase
      .from("products")
      .insert({ seller_id, slug, title, product_type, currency: SHOP_CURRENCY })
      .select("id")
      .single();
    if (data) productId = data.id;
    else if (error?.code === "42501") {
      return {
        status: "error",
        message: MIGRATION_NOTICE,
        values: formValues(formData),
      };
    } else if (error?.code !== "23505") return failedForm(formData);
  }
  if (!productId) return failedForm(formData);

  await supabase.from("product_variants").insert({
    product_id: productId,
    name: product_type === "digital" ? "Download" : "Standard",
    price_amount: price,
  });
  updateTag(SHOP_TAG);
  redirect(path(productId));
}

export async function updateProductAsStaff(
  productId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await staff(path(productId));
  if (!UUID.test(productId)) return failedForm(formData);
  const parsed = productDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);
  const result = await writeProductDetails(
    supabase,
    productId,
    parsed.data,
    formData,
  );
  if (result.status !== "success") return result;
  updateTag(SHOP_TAG);
  return savedForm(formData);
}

export async function saveVariantsAsStaff(
  productId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await staff(path(productId));
  if (!UUID.test(productId)) return failedForm(formData, VARIANT_FIELDS);
  const result = await writeVariants(supabase, productId, formData);
  if (
    result.status === "error" &&
    !result.fieldErrors &&
    result.message?.startsWith("Saving failed")
  ) {
    return { ...result, message: `${result.message} ${MIGRATION_NOTICE}` };
  }
  if (result.status !== "success") return result;
  updateTag(SHOP_TAG);
  return result;
}

export async function registerProductImageAsStaff(
  productId: string,
  input: RegisterImageInput,
): Promise<ImageResult> {
  const { user, supabase } = await staff(path(productId));
  const result = await registerOwnedImage(
    supabase,
    user.id,
    "product",
    productId,
    input,
  );
  if (result.ok) updateTag(SHOP_TAG);
  return result;
}

export async function setProductCoverAsStaff(
  productId: string,
  assetId: string,
) {
  const { supabase } = await staff(path(productId));
  if (await makeLeadImage(supabase, "product", productId, assetId))
    updateTag(SHOP_TAG);
}

export async function deleteProductImageAsStaff(
  productId: string,
  assetId: string,
) {
  const { supabase } = await staff(path(productId));
  if (await deleteOwnedImage(supabase, "product", productId, assetId))
    updateTag(SHOP_TAG);
}

/** Records a download file the browser uploaded to products/<id>/…. */
export async function registerProductFileAsStaff(
  productId: string,
  input: { path: string; fileName: string },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { supabase } = await staff(path(productId));
  if (
    !input.path.startsWith(`products/${productId}/`) ||
    input.path.includes("..")
  ) {
    return { ok: false, message: "Invalid upload path." };
  }
  const { data: info, error } = await supabase.storage
    .from(DIGITAL_BUCKET)
    .info(input.path);
  if (error || !info?.size) return { ok: false, message: "Upload not found." };
  const { error: insertError } = await supabase.from("product_files").insert({
    product_id: productId,
    storage_path: input.path,
    file_name: input.fileName.trim().slice(0, 200) || "download",
    size_bytes: info.size,
  });
  if (insertError) {
    return {
      ok: false,
      message:
        isMissingSchema(insertError) || insertError.code === "42501"
          ? MIGRATION_NOTICE
          : "Could not save the file.",
    };
  }
  updateTag(SHOP_TAG);
  return { ok: true };
}

export async function deleteProductFileAsStaff(
  productId: string,
  fileId: string,
) {
  const { supabase } = await staff(path(productId));
  const { data: file } = await supabase
    .from("product_files")
    .select("id, storage_path")
    .eq("id", fileId)
    .eq("product_id", productId)
    .maybeSingle();
  if (!file) return;
  const { error } = await supabase
    .from("product_files")
    .delete()
    .eq("id", file.id);
  if (!error)
    await supabase.storage.from(DIGITAL_BUCKET).remove([file.storage_path]);
}

/**
 * Deletes a product with its options, photos and download files. Products
 * that were ordered can't be deleted (order history keeps them): archive.
 */
export async function deleteProductAsStaff(
  productId: string,
): Promise<FormState> {
  const { supabase } = await staff(path(productId));
  const [photos, downloads] = await Promise.all([
    ownedMediaFiles(supabase, "product", productId),
    supabase
      .from("product_files")
      .select("storage_path")
      .eq("product_id", productId),
  ]);
  const { error, count } = await supabase
    .from("products")
    .delete({ count: "exact" })
    .eq("id", productId);
  if (error?.code === "23503") {
    return {
      status: "error",
      message:
        "This product has orders, so it stays in the order history. Set the status to Archived instead.",
    };
  }
  if (error || !count) {
    return {
      status: "error",
      message: `Could not delete the product. ${MIGRATION_NOTICE}`,
    };
  }
  await removeStoredFiles(supabase, photos);
  const files = (downloads.data ?? []).map((row) => row.storage_path);
  if (files.length) await supabase.storage.from(DIGITAL_BUCKET).remove(files);
  updateTag(SHOP_TAG);
  redirect(path());
}
