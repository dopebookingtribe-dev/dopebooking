import "server-only";
import { failedForm, formValues, savedForm, type FormState } from "@/lib/forms";
import type { createClient } from "@/lib/supabase/server";
import { productDetailsSchema, variantsSchema } from "./schemas";
import type { z } from "zod";

// Shared by the seller's and the admin's product editors. Callers check
// who may edit the product first; RLS enforces the same in the database.

type Client = Awaited<ReturnType<typeof createClient>>;

export const VARIANT_FIELDS = [
  "v.id",
  "v.name",
  "v.sku",
  "v.price",
  "v.stock",
  "v.active",
];

/** Saves product details after the publish checks (options, download file). */
export async function writeProductDetails(
  supabase: Client,
  productId: string,
  data: z.output<typeof productDetailsSchema>,
  formData: FormData,
): Promise<FormState> {
  if (data.status === "published" && data.product_type === "digital") {
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
  if (data.status === "published") {
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
    .update(data)
    .eq("id", productId);
  if (error?.code === "23505") {
    return {
      status: "error",
      fieldErrors: { slug: ["Another product already uses this URL."] },
      values: formValues(formData),
    };
  }
  if (error) return failedForm(formData);
  return savedForm(formData);
}

/** Replaces a product's options (sizes, editions…) with the submitted list. */
export async function writeVariants(
  supabase: Client,
  productId: string,
  formData: FormData,
): Promise<FormState> {
  const multi = VARIANT_FIELDS;
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

  return { status: "success", message: "Options saved." };
}
