"use server";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

const DIGITAL_BUCKET = "digital-goods";

type Result = { ok: true } | { ok: false; message: string };

async function ownsProduct(productId: string) {
  const user = await requireUser(`/dashboard/seller/products/${productId}`);
  const supabase = await createClient();
  const { data: seller } = await supabase
    .from("sellers")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!seller) return null;
  const { data: product } = await supabase
    .from("products")
    .select("id, product_type")
    .eq("id", productId)
    .eq("seller_id", seller.id)
    .maybeSingle();
  return product ? supabase : null;
}

/** Records a file the browser uploaded to products/<id>/… in the private bucket. */
export async function registerProductFile(
  productId: string,
  input: { path: string; fileName: string },
): Promise<Result> {
  const supabase = await ownsProduct(productId);
  if (!supabase) return { ok: false, message: "Product not found." };
  if (
    !input.path.startsWith(`products/${productId}/`) ||
    input.path.includes("..")
  ) {
    return { ok: false, message: "Invalid upload path." };
  }
  const fileName = input.fileName.trim().slice(0, 200) || "download";
  const { data: info, error } = await supabase.storage
    .from(DIGITAL_BUCKET)
    .info(input.path);
  if (error || !info?.size) return { ok: false, message: "Upload not found." };

  const { error: insertError } = await supabase.from("product_files").insert({
    product_id: productId,
    storage_path: input.path,
    file_name: fileName,
    size_bytes: info.size,
  });
  if (insertError) return { ok: false, message: "Could not save the file." };
  return { ok: true };
}

export async function deleteProductFile(productId: string, fileId: string) {
  const supabase = await ownsProduct(productId);
  if (!supabase) return;
  const { data: file } = await supabase
    .from("product_files")
    .select("id, storage_path")
    .eq("id", fileId)
    .eq("product_id", productId)
    .maybeSingle();
  if (!file) return;
  await supabase.from("product_files").delete().eq("id", file.id);
  await supabase.storage.from(DIGITAL_BUCKET).remove([file.storage_path]);
}
