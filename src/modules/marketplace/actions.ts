"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { staffClient } from "@/lib/auth/staff";
import { sendQueuedEmailsAfterResponse } from "@/lib/email/after";
import {
  failedForm,
  formValues,
  invalidForm,
  savedForm,
  type FormState,
} from "@/lib/forms";
import type { createClient as CreateClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/validation";
import {
  deleteOwnedImage,
  makeLeadImage,
  registerOwnedImage,
  type ImageResult,
  type RegisterImageInput,
} from "@/modules/media/server";
import { SHOP_TAG } from "./queries";
import {
  createProductSchema,
  productDetailsSchema,
  reviewSellerSchema,
  sellerApplicationSchema,
  sellerProfileSchema,
  SHOP_CURRENCY,
  variantsSchema,
} from "./schemas";

type Client = Awaited<ReturnType<typeof CreateClient>>;

/** Tries `base`, then `base-2`… against a unique slug column. */
type SlugInsertResult = {
  data: { id: string } | null;
  error: { code?: string } | null;
};

async function insertWithUniqueSlug(
  base: string,
  insert: (slug: string) => PromiseLike<SlugInsertResult>,
): Promise<SlugInsertResult> {
  const root = base || "item";
  for (let attempt = 0; attempt < 6; attempt++) {
    const slug =
      attempt === 0
        ? root
        : `${root.slice(0, 80)}-${attempt < 3 ? attempt + 1 : Math.random().toString(36).slice(2, 6)}`;
    const result = await insert(slug);
    if (result.error?.code !== "23505") return result;
  }
  return { data: null, error: { code: "23505" } };
}

async function mySeller(supabase: Client, userId: string) {
  const { data } = await supabase
    .from("sellers")
    .select("id, status, display_name")
    .eq("owner_user_id", userId)
    .maybeSingle();
  return data;
}

async function myProduct(supabase: Client, userId: string, productId: string) {
  const seller = await mySeller(supabase, userId);
  if (!seller) return null;
  const { data } = await supabase
    .from("products")
    .select("id, slug, title")
    .eq("id", productId)
    .eq("seller_id", seller.id)
    .maybeSingle();
  return data ? { ...data, seller } : null;
}

// ---------------------------------------------------------------------------
// Seller application and profile
// ---------------------------------------------------------------------------

export async function applyToSell(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser("/sell");
  const parsed = sellerApplicationSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsed.success) return invalidForm(parsed.error, formData);
  const { application_note, ...profile } = parsed.data;

  const supabase = await createClient();
  if (await mySeller(supabase, user.id)) redirect("/dashboard/seller");

  const { data: seller, error } = await insertWithUniqueSlug(
    slugify(profile.display_name),
    async (slug) =>
      supabase
        .from("sellers")
        .insert({ ...profile, slug, owner_user_id: user.id })
        .select("id")
        .single(),
  );
  if (error || !seller) return failedForm(formData);

  await supabase
    .from("seller_private")
    .insert({ seller_id: seller.id, application_note });
  sendQueuedEmailsAfterResponse();
  redirect("/dashboard/seller?applied=1");
}

export async function updateSellerProfile(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser("/dashboard/seller");
  const parsed = sellerProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);

  const supabase = await createClient();
  const { error } = await supabase
    .from("sellers")
    .update(parsed.data)
    .eq("owner_user_id", user.id);
  if (error) return failedForm(formData);
  updateTag(SHOP_TAG);
  return savedForm(formData);
}

export async function registerSellerLogo(
  input: RegisterImageInput,
): Promise<ImageResult> {
  const user = await requireUser("/dashboard/seller");
  const supabase = await createClient();
  const seller = await mySeller(supabase, user.id);
  if (!seller) return { ok: false, message: "No shop found." };
  // A shop has one logo: replace the previous one.
  const { data: old } = await supabase
    .from("media_assets")
    .select("id")
    .eq("seller_id", seller.id);
  const result = await registerOwnedImage(
    supabase,
    user.id,
    "seller",
    seller.id,
    input,
  );
  if (result.ok) {
    const { data: latest } = await supabase
      .from("media_assets")
      .select("id")
      .eq("seller_id", seller.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (latest) await makeLeadImage(supabase, "seller", seller.id, latest.id);
    for (const previous of old ?? []) {
      await deleteOwnedImage(supabase, "seller", seller.id, previous.id);
    }
    updateTag(SHOP_TAG);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function createProduct(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser("/dashboard/seller/products/new");
  const parsed = createProductSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);

  const supabase = await createClient();
  const seller = await mySeller(supabase, user.id);
  if (!seller || seller.status !== "approved") {
    return {
      status: "error",
      message: "Your shop needs to be approved first.",
    };
  }

  const { data: product, error } = await insertWithUniqueSlug(
    slugify(parsed.data.title),
    async (slug) =>
      supabase
        .from("products")
        .insert({
          seller_id: seller.id,
          slug,
          title: parsed.data.title,
          product_type: parsed.data.product_type,
          currency: SHOP_CURRENCY,
        })
        .select("id")
        .single(),
  );
  if (error || !product) return failedForm(formData);

  await supabase.from("product_variants").insert({
    product_id: product.id,
    name: parsed.data.product_type === "digital" ? "Download" : "Standard",
    price_amount: parsed.data.price,
  });
  redirect(`/dashboard/seller/products/${product.id}`);
}

export async function updateProduct(
  productId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser(`/dashboard/seller/products/${productId}`);
  const parsed = productDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);

  const supabase = await createClient();
  if (!(await myProduct(supabase, user.id, productId)))
    return failedForm(formData);

  if (
    parsed.data.status === "published" &&
    parsed.data.product_type === "digital"
  ) {
    const { count: files } = await supabase
      .from("product_files")
      .select("id", { count: "exact", head: true })
      .eq("product_id", productId);
    if (!files) {
      return {
        status: "error",
        fieldErrors: {
          status: ["Add a download file before publishing a digital product."],
        },
        values: formValues(formData),
      };
    }
  }
  if (parsed.data.status === "published") {
    const { count } = await supabase
      .from("product_variants")
      .select("id", { count: "exact", head: true })
      .eq("product_id", productId)
      .eq("active", true);
    if (!count) {
      return {
        status: "error",
        fieldErrors: {
          status: ["Add at least one active option before publishing."],
        },
        values: formValues(formData),
      };
    }
  }

  const { error } = await supabase
    .from("products")
    .update(parsed.data)
    .eq("id", productId);
  if (error?.code === "23505") {
    return {
      status: "error",
      fieldErrors: { slug: ["Another product already uses this URL."] },
      values: formValues(formData),
    };
  }
  if (error) return failedForm(formData);
  updateTag(SHOP_TAG);
  return savedForm(formData);
}

export async function saveVariants(
  productId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser(`/dashboard/seller/products/${productId}`);
  const multi = ["v.id", "v.name", "v.sku", "v.price", "v.stock", "v.active"];
  const ids = formData.getAll("v.id").map(String);
  const rows = ids.map((id, index) => ({
    id,
    name: String(formData.getAll("v.name")[index] ?? ""),
    sku: String(formData.getAll("v.sku")[index] ?? ""),
    price: String(formData.getAll("v.price")[index] ?? ""),
    stock: String(formData.getAll("v.stock")[index] ?? ""),
    active: String(formData.getAll("v.active")[index] ?? "") === "on",
  }));
  const parsed = variantsSchema.safeParse(rows);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const row =
      typeof issue?.path[0] === "number" ? `Option ${issue.path[0] + 1}: ` : "";
    return {
      status: "error",
      message: `${row}${issue?.message ?? "Check the options."}`,
      values: formValues(formData, multi),
    };
  }

  const supabase = await createClient();
  if (!(await myProduct(supabase, user.id, productId)))
    return failedForm(formData, multi);

  const keep = parsed.data
    .map((row) => row.id)
    .filter((id): id is string => !!id);
  const remove = supabase
    .from("product_variants")
    .delete()
    .eq("product_id", productId);
  const { error: deleteError } = keep.length
    ? await remove.not("id", "in", `(${keep.join(",")})`)
    : await remove;
  if (deleteError) return failedForm(formData, multi);

  for (const [index, row] of parsed.data.entries()) {
    const values = {
      name: row.name,
      sku: row.sku,
      price_amount: row.price,
      stock: row.stock,
      active: row.active,
      sort_order: index,
    };
    const { error } = row.id
      ? await supabase
          .from("product_variants")
          .update(values)
          .eq("id", row.id)
          .eq("product_id", productId)
      : await supabase
          .from("product_variants")
          .insert({ ...values, product_id: productId });
    if (error?.code === "23505") {
      return {
        status: "error",
        message: `Option ${index + 1}: that SKU is already used.`,
        values: formValues(formData, multi),
      };
    }
    if (error) return failedForm(formData, multi);
  }

  updateTag(SHOP_TAG);
  return { status: "success", message: "Options saved." };
}

export async function deleteDraftProduct(productId: string) {
  const user = await requireUser(`/dashboard/seller/products/${productId}`);
  const supabase = await createClient();
  if (!(await myProduct(supabase, user.id, productId))) return;
  // RLS only allows deleting drafts.
  const { data: media } = await supabase
    .from("media_assets")
    .select("id")
    .eq("product_id", productId);
  for (const asset of media ?? []) {
    await deleteOwnedImage(supabase, "product", productId, asset.id);
  }
  await supabase
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("status", "draft");
  redirect("/dashboard/seller");
}

export async function registerProductImage(
  productId: string,
  input: RegisterImageInput,
): Promise<ImageResult> {
  const user = await requireUser(`/dashboard/seller/products/${productId}`);
  const supabase = await createClient();
  if (!(await myProduct(supabase, user.id, productId))) {
    return { ok: false, message: "Product not found." };
  }
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

export async function setProductCover(productId: string, assetId: string) {
  const user = await requireUser(`/dashboard/seller/products/${productId}`);
  const supabase = await createClient();
  if (!(await myProduct(supabase, user.id, productId))) return;
  if (await makeLeadImage(supabase, "product", productId, assetId))
    updateTag(SHOP_TAG);
}

export async function deleteProductImage(productId: string, assetId: string) {
  const user = await requireUser(`/dashboard/seller/products/${productId}`);
  const supabase = await createClient();
  if (!(await myProduct(supabase, user.id, productId))) return;
  if (await deleteOwnedImage(supabase, "product", productId, assetId))
    updateTag(SHOP_TAG);
}

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------

export async function reviewSeller(
  sellerId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await staffClient(`/admin/sellers/${sellerId}`);
  const parsed = reviewSellerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);

  const { error } = await supabase.rpc("review_seller", {
    p_seller: sellerId,
    p_status: parsed.data.status,
    p_note: parsed.data.note,
  });
  if (error) return failedForm(formData);

  if (parsed.data.commission_percent !== null) {
    await supabase
      .from("seller_private")
      .update({
        commission_rate_bps: Math.round(parsed.data.commission_percent * 100),
      })
      .eq("seller_id", sellerId);
  }
  updateTag(SHOP_TAG);
  sendQueuedEmailsAfterResponse();
  return {
    status: "success",
    message: "Decision saved. The seller has been notified.",
  };
}

export async function archiveProductAsStaff(productId: string) {
  const { supabase } = await staffClient("/admin/sellers");
  await supabase
    .from("products")
    .update({ status: "archived" })
    .eq("id", productId);
  updateTag(SHOP_TAG);
}
