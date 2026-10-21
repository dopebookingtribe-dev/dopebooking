"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/permissions";
import {
  failedForm,
  invalidForm,
  savedForm,
  slugTakenForm,
  type FormState,
} from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import {
  checkboxSchema,
  optionalText,
  optionalUuid,
  requiredText,
  slugify,
  slugSchema,
  statusSchema,
} from "@/lib/validation";
import { SHOP_TAG } from "./queries";

const categorySchema = z
  .object({
    name: requiredText("category name", 80),
    slug: z.string().trim(),
    description: optionalText(300),
    sort_order: z.coerce.number().int().min(-1000).max(1000),
    visible: checkboxSchema,
  })
  .transform((data) => ({ ...data, slug: data.slug || slugify(data.name) }))
  .pipe(
    z.object({
      name: z.string(),
      slug: slugSchema,
      description: z.string().nullable(),
      sort_order: z.number(),
      visible: z.boolean(),
    }),
  );

function done() {
  updateTag(SHOP_TAG);
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
}

export async function saveCategory(
  id: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePermission("content.manage", "/admin/categories");
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("product_categories").update(parsed.data).eq("id", id)
    : await supabase.from("product_categories").insert(parsed.data);
  if (error?.code === "23505") return slugTakenForm(formData);
  if (error) return failedForm(formData);
  done();
  return id
    ? savedForm(formData)
    : { status: "success", message: "Category added." };
}

export async function deleteCategory(id: string) {
  await requirePermission("content.manage", "/admin/categories");
  if (!z.uuid().safeParse(id).success) return;
  const supabase = await createClient();
  await supabase.from("product_categories").delete().eq("id", id);
  done();
}

const curationSchema = z.object({
  category_id: optionalUuid,
  featured: checkboxSchema,
  sort_order: z.coerce.number().int().min(-1000).max(1000),
  status: statusSchema,
  seo_title: optionalText(70),
  seo_description: optionalText(200),
});

/** Staff curation: category, featuring, order, visibility and SEO. */
export async function curateProduct(
  productId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePermission("content.manage", "/admin/products");
  if (!z.uuid().safeParse(productId).success) return failedForm(formData);
  const parsed = curationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update(parsed.data)
    .eq("id", productId);
  if (error) return failedForm(formData);
  done();
  return savedForm(formData);
}
