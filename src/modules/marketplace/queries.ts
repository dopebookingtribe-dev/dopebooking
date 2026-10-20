import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { requireRole, requireUser, STAFF_ROLES } from "@/lib/auth/dal";
import { toImage, type Image } from "@/lib/media";
import type { ProductType, SellerStatus } from "@/lib/supabase/database.types";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { fetchImagesById } from "@/modules/media/queries";
import { MEDIA_COLUMNS } from "@/modules/media/server";

export const SHOP_TAG = "shop";
const UUID = /^[0-9a-f-]{36}$/i;

// ---------------------------------------------------------------------------
// Seller self-service (session; RLS limits to the owner's rows)
// ---------------------------------------------------------------------------

export async function getMySeller() {
  const user = await requireUser("/dashboard/seller");
  const supabase = await createClient();
  const { data: seller } = await supabase
    .from("sellers")
    .select("*")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!seller)
    return { user, seller: null, privateInfo: null, products: [], logo: null };

  const [privateInfo, products, logo] = await Promise.all([
    supabase
      .from("seller_private")
      .select("*")
      .eq("seller_id", seller.id)
      .maybeSingle(),
    supabase
      .from("products")
      .select("id, slug, title, status, product_type, updated_at")
      .eq("seller_id", seller.id)
      .order("updated_at", { ascending: false }),
    fetchImagesById(supabase, [seller.logo_asset_id]),
  ]);
  return {
    user,
    seller,
    privateInfo: privateInfo.data,
    products: products.data ?? [],
    logo: seller.logo_asset_id
      ? (logo.get(seller.logo_asset_id) ?? null)
      : null,
  };
}

export async function getMyProduct(id: string) {
  const user = await requireUser(`/dashboard/seller/products/${id}`);
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  // Only products of the user's own shop (staff could otherwise read any).
  const { data: seller } = await supabase
    .from("sellers")
    .select("id, status")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!seller) return null;
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("seller_id", seller.id)
    .maybeSingle();
  if (!product) return null;

  const [variants, media] = await Promise.all([
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
  ]);
  return {
    product,
    sellerStatus: seller.status,
    variants: variants.data ?? [],
    images: (media.data ?? []).map(toImage),
  };
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function listSellersForAdmin(status: SellerStatus | "all") {
  await requireRole(STAFF_ROLES, "/admin/sellers");
  const supabase = await createClient();
  let query = supabase
    .from("sellers")
    .select("id, slug, display_name, status, country, created_at");
  if (status !== "all") query = query.eq("status", status);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load sellers: ${error.message}`);
  return data;
}

export async function getSellerForAdmin(id: string) {
  await requireRole(STAFF_ROLES, `/admin/sellers/${id}`);
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data: seller } = await supabase
    .from("sellers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!seller) return null;
  const [privateInfo, products, owner] = await Promise.all([
    supabase
      .from("seller_private")
      .select("*")
      .eq("seller_id", id)
      .maybeSingle(),
    supabase
      .from("products")
      .select("id, slug, title, status, product_type, updated_at")
      .eq("seller_id", id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", seller.owner_user_id)
      .maybeSingle(),
  ]);
  return {
    seller,
    privateInfo: privateInfo.data,
    products: products.data ?? [],
    ownerName: owner.data?.display_name ?? null,
  };
}

// ---------------------------------------------------------------------------
// Public shop (cached; anonymous client so RLS shows only live products)
// ---------------------------------------------------------------------------

export type ShopCard = {
  id: string;
  slug: string;
  title: string;
  productType: ProductType;
  cover: Image | null;
  fromPrice: number | null;
  currency: string;
  seller: { slug: string; name: string };
};

export type ShopProduct = ShopCard & {
  description: string | null;
  images: Image[];
  variants: { id: string; name: string; price: number; inStock: boolean }[];
};

async function loadCards(
  filter: { sellerId?: string } = {},
): Promise<ShopCard[]> {
  const supabase = createPublicClient();
  let query = supabase
    .from("products")
    .select(
      "id, slug, title, product_type, currency, cover_asset_id, seller_id, published_at",
    )
    .eq("status", "published");
  if (filter.sellerId) query = query.eq("seller_id", filter.sellerId);
  const { data: products, error } = await query.order("published_at", {
    ascending: false,
  });
  if (error) throw new Error(`Failed to load products: ${error.message}`);
  if (!products.length) return [];

  const ids = products.map((product) => product.id);
  const [variants, sellers, covers] = await Promise.all([
    supabase
      .from("product_variants")
      .select("product_id, price_amount")
      .in("product_id", ids),
    supabase
      .from("sellers")
      .select("id, slug, display_name")
      .in("id", [...new Set(products.map((product) => product.seller_id))]),
    fetchImagesById(
      supabase,
      products.map((product) => product.cover_asset_id),
    ),
  ]);
  if (variants.error || sellers.error)
    throw new Error("Failed to load the shop.");

  const minPrice = new Map<string, number>();
  for (const variant of variants.data) {
    const current = minPrice.get(variant.product_id);
    if (current === undefined || variant.price_amount < current) {
      minPrice.set(variant.product_id, variant.price_amount);
    }
  }
  const sellerById = new Map(sellers.data.map((seller) => [seller.id, seller]));

  return products.flatMap((product) => {
    const seller = sellerById.get(product.seller_id);
    if (!seller) return [];
    return [
      {
        id: product.id,
        slug: product.slug,
        title: product.title,
        productType: product.product_type,
        cover: product.cover_asset_id
          ? (covers.get(product.cover_asset_id) ?? null)
          : null,
        fromPrice: minPrice.get(product.id) ?? null,
        currency: product.currency,
        seller: { slug: seller.slug, name: seller.display_name },
      },
    ];
  });
}

export async function getShopProducts(): Promise<ShopCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(SHOP_TAG);
  return loadCards();
}

export async function getShopProduct(
  slug: string,
): Promise<ShopProduct | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(SHOP_TAG);

  const supabase = createPublicClient();
  const { data: product } = await supabase
    .from("products")
    .select(
      "id, slug, title, description, product_type, currency, cover_asset_id, seller_id",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!product) return null;

  const [variants, media, seller] = await Promise.all([
    supabase
      .from("product_variants")
      .select("id, name, price_amount, stock")
      .eq("product_id", product.id)
      .order("sort_order"),
    supabase
      .from("media_assets")
      .select(MEDIA_COLUMNS)
      .eq("product_id", product.id)
      .order("sort_order"),
    supabase
      .from("sellers")
      .select("slug, display_name")
      .eq("id", product.seller_id)
      .maybeSingle(),
  ]);
  if (!seller.data) return null;

  const images = (media.data ?? []).map(toImage);
  const cover =
    images.find((image) => image.id === product.cover_asset_id) ??
    images[0] ??
    null;
  const options = (variants.data ?? []).map((variant) => ({
    id: variant.id,
    name: variant.name,
    price: variant.price_amount,
    inStock: variant.stock === null || variant.stock > 0,
  }));
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    description: product.description,
    productType: product.product_type,
    currency: product.currency,
    cover,
    // Cover first, then the rest.
    images: cover
      ? [cover, ...images.filter((image) => image.id !== cover.id)]
      : images,
    fromPrice: options.length
      ? Math.min(...options.map((option) => option.price))
      : null,
    variants: options,
    seller: { slug: seller.data.slug, name: seller.data.display_name },
  };
}

export async function getStorefront(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(SHOP_TAG);

  const supabase = createPublicClient();
  const { data: seller } = await supabase
    .from("sellers")
    .select("id, slug, display_name, bio, country, website, logo_asset_id")
    .eq("slug", slug)
    .maybeSingle();
  if (!seller) return null;
  const [products, logo] = await Promise.all([
    loadCards({ sellerId: seller.id }),
    fetchImagesById(supabase, [seller.logo_asset_id]),
  ]);
  return {
    seller,
    logo: seller.logo_asset_id
      ? (logo.get(seller.logo_asset_id) ?? null)
      : null,
    products,
  };
}

export type PricedLine = {
  variantId: string;
  quantity: number;
  productSlug: string;
  productTitle: string;
  variantName: string;
  unitPrice: number;
  currency: string;
  image: Image | null;
  available: boolean;
  maxQuantity: number;
};

/** Current prices and availability for cart lines (never trust the client). */
export async function priceCartLines(
  items: { variantId: string; quantity: number }[],
) {
  if (!items.length) return [];
  const supabase = createPublicClient();
  const { data: variants } = await supabase
    .from("product_variants")
    .select("id, product_id, name, price_amount, stock")
    .in(
      "id",
      items.map((item) => item.variantId),
    );
  if (!variants?.length) return [];
  const { data: products } = await supabase
    .from("products")
    .select("id, slug, title, currency, cover_asset_id")
    .in("id", [...new Set(variants.map((variant) => variant.product_id))]);
  const images = await fetchImagesById(
    supabase,
    (products ?? []).map((product) => product.cover_asset_id),
  );
  const variantById = new Map(variants.map((variant) => [variant.id, variant]));
  const productById = new Map(
    (products ?? []).map((product) => [product.id, product]),
  );

  return items.flatMap((item): PricedLine[] => {
    const variant = variantById.get(item.variantId);
    const product = variant ? productById.get(variant.product_id) : undefined;
    if (!variant || !product) return [];
    const maxQuantity =
      variant.stock === null ? 20 : Math.min(20, variant.stock);
    return [
      {
        variantId: variant.id,
        quantity: Math.min(item.quantity, Math.max(maxQuantity, 1)),
        productSlug: product.slug,
        productTitle: product.title,
        variantName: variant.name,
        unitPrice: variant.price_amount,
        currency: product.currency,
        image: product.cover_asset_id
          ? (images.get(product.cover_asset_id) ?? null)
          : null,
        available: maxQuantity > 0,
        maxQuantity,
      },
    ];
  });
}
