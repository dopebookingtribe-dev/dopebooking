import "server-only";
import { requirePermission } from "@/lib/auth/permissions";
import { toImage } from "@/lib/media";
import type { ContentStatus } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { MEDIA_COLUMNS } from "@/modules/media/server";

const UUID = /^[0-9a-f-]{36}$/i;

export async function approvedSellers() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sellers")
    .select("id, display_name")
    .eq("status", "approved")
    .order("display_name");
  return data ?? [];
}

/** Everything the admin product editor shows. */
export async function getProductForAdmin(id: string) {
  await requirePermission("content.manage", `/admin/products/${id}`);
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!product) return null;
  const [variants, media, files, seller, categories, orders] =
    await Promise.all([
      supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", id)
        .order("sort_order"),
      supabase
        .from("media_assets")
        .select(MEDIA_COLUMNS)
        .eq("product_id", id)
        .order("sort_order"),
      supabase
        .from("product_files")
        .select("id, file_name, size_bytes")
        .eq("product_id", id)
        .order("created_at"),
      supabase
        .from("sellers")
        .select("id, display_name, status")
        .eq("id", product.seller_id)
        .maybeSingle(),
      supabase
        .from("product_categories")
        .select("id, name")
        .order("sort_order"),
      supabase
        .from("order_items")
        .select("id", { count: "exact", head: true })
        .eq("product_id", id),
    ]);
  return {
    product,
    variants: variants.data ?? [],
    images: (media.data ?? []).map(toImage),
    files: files.data ?? [],
    seller: seller.data,
    categories: categories.data ?? [],
    orderCount: orders.count ?? 0,
  };
}

export type ProductListFilter = {
  q?: string;
  status?: ContentStatus;
  seller?: string;
};

export async function listProductsForAdmin(filter: ProductListFilter) {
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select(
      "id, slug, title, status, featured, sort_order, category_id, seller_id, is_demo, seo_title, seo_description, product_type, updated_at",
    )
    .order("featured", { ascending: false })
    .order("sort_order")
    .order("updated_at", { ascending: false })
    .limit(300);
  if (filter.status) query = query.eq("status", filter.status);
  if (filter.seller && UUID.test(filter.seller))
    query = query.eq("seller_id", filter.seller);
  const term = filter.q
    ?.replace(/[%_,().*\\"]/g, " ")
    .trim()
    .slice(0, 80);
  if (term) query = query.ilike("title", `%${term}%`);
  const [products, categories, sellers] = await Promise.all([
    query,
    supabase.from("product_categories").select("id, name").order("sort_order"),
    supabase.from("sellers").select("id, display_name").order("display_name"),
  ]);
  return {
    products: products.data ?? [],
    categories: categories.data ?? [],
    sellers: sellers.data ?? [],
  };
}
