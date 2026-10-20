import "server-only";
import { requireRole, requireUser, STAFF_ROLES } from "@/lib/auth/dal";
import type {
  OrderItemRow,
  OrderRow,
  SellerOrderRow,
} from "@/lib/supabase/database.types";
import { hasServiceRole } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { tokenMatches } from "./server";

const UUID = /^[0-9a-f-]{36}$/i;
const DOWNLOAD_TTL_SECONDS = 15 * 60;

export type Download = { fileName: string; url: string };

export type OrderView = {
  order: OrderRow;
  parts: (SellerOrderRow & {
    sellerName: string;
    sellerSlug: string;
    items: (OrderItemRow & { downloads: Download[] })[];
  })[];
};

type Client =
  | Awaited<ReturnType<typeof createClient>>
  | ReturnType<typeof createAdminClient>;

/**
 * Builds the full order view. `client` decides visibility (session = RLS,
 * admin = only after the caller verified access). Download links are only
 * signed for paid, non-refunded orders.
 */
async function buildOrderView(
  client: Client,
  order: OrderRow,
): Promise<OrderView> {
  const [{ data: parts }, { data: items }] = await Promise.all([
    client
      .from("seller_orders")
      .select("*")
      .eq("order_id", order.id)
      .order("created_at"),
    client.from("order_items").select("*").eq("order_id", order.id),
  ]);
  const admin = createAdminClient();
  const { data: sellers } = await admin
    .from("sellers")
    .select("id, display_name, slug")
    .in(
      "id",
      (parts ?? []).map((part) => part.seller_id),
    );
  const sellerById = new Map(
    (sellers ?? []).map((seller) => [seller.id, seller]),
  );

  const canDownload = ["paid", "fulfilled"].includes(order.status);
  const digitalProductIds = canDownload
    ? [
        ...new Set(
          (items ?? [])
            .filter((i) => i.product_type === "digital" && i.product_id)
            .map((i) => i.product_id!),
        ),
      ]
    : [];
  const filesByProduct = new Map<string, Download[]>();
  if (digitalProductIds.length) {
    const { data: files } = await admin
      .from("product_files")
      .select("product_id, storage_path, file_name")
      .in("product_id", digitalProductIds);
    for (const file of files ?? []) {
      const { data } = await admin.storage
        .from("digital-goods")
        .createSignedUrl(file.storage_path, DOWNLOAD_TTL_SECONDS, {
          download: file.file_name,
        });
      if (!data?.signedUrl) continue;
      const list = filesByProduct.get(file.product_id) ?? [];
      list.push({ fileName: file.file_name, url: data.signedUrl });
      filesByProduct.set(file.product_id, list);
    }
  }

  return {
    order,
    parts: (parts ?? []).map((part) => ({
      ...part,
      sellerName: sellerById.get(part.seller_id)?.display_name ?? "Seller",
      sellerSlug: sellerById.get(part.seller_id)?.slug ?? "",
      items: (items ?? [])
        .filter((item) => item.seller_order_id === part.id)
        .map((item) => ({
          ...item,
          downloads: item.product_id
            ? (filesByProduct.get(item.product_id) ?? [])
            : [],
        })),
    })),
  };
}

// Buyers -----------------------------------------------------------------

export async function listMyOrders() {
  const user = await requireUser("/dashboard/orders");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, reference, status, total, currency, created_at")
    .eq("buyer_id", user.id)
    .neq("status", "pending_payment")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load orders: ${error.message}`);
  return data;
}

export async function getMyOrder(id: string) {
  const user = await requireUser(`/dashboard/orders/${id}`);
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .eq("buyer_id", user.id)
    .maybeSingle();
  return order ? buildOrderView(supabase, order) : null;
}

/** Guest access via the private link (token checked in constant time). */
export async function getOrderWithToken(id: string, token: string | undefined) {
  if (!UUID.test(id) || !token || !hasServiceRole()) return null;
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!order || !tokenMatches(token, order.access_token_hash)) return null;
  return buildOrderView(admin, order);
}

// Sellers ----------------------------------------------------------------

export async function listMySellerOrders() {
  const user = await requireUser("/dashboard/seller/orders");
  const supabase = await createClient();
  const { data: seller } = await supabase
    .from("sellers")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!seller) return [];
  const { data } = await supabase
    .from("seller_orders")
    .select(
      "id, order_id, status, items_total, shipping_amount, seller_amount, transfer_status, created_at",
    )
    .eq("seller_id", seller.id)
    .neq("status", "pending")
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getMySellerOrder(id: string) {
  const user = await requireUser(`/dashboard/seller/orders/${id}`);
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data: seller } = await supabase
    .from("sellers")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!seller) return null;
  // RLS + explicit seller filter: only this seller's part of the order.
  const { data: part } = await supabase
    .from("seller_orders")
    .select("*")
    .eq("id", id)
    .eq("seller_id", seller.id)
    .maybeSingle();
  if (!part) return null;
  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("seller_order_id", part.id);
  // Shipping details come from the order row, which sellers can't read
  // directly; share only what's needed to ship.
  const { data: order } = await createAdminClient()
    .from("orders")
    .select("reference, status, shipping_name, shipping_address, created_at")
    .eq("id", part.order_id)
    .single();
  return { part, items: items ?? [], order };
}

export async function getMyPayoutStatus() {
  const user = await requireUser("/dashboard/seller");
  const supabase = await createClient();
  const { data: seller } = await supabase
    .from("sellers")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!seller) return null;
  const { data } = await supabase
    .from("seller_stripe")
    .select("*")
    .eq("seller_id", seller.id)
    .maybeSingle();
  return data;
}

// Staff ------------------------------------------------------------------

export async function listOrdersForAdmin(filter: "attention" | "paid" | "all") {
  await requireRole(STAFF_ROLES, "/admin/orders");
  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select(
      "id, reference, status, total, currency, buyer_email, needs_attention, created_at",
    );
  if (filter === "attention") query = query.not("needs_attention", "is", null);
  else if (filter === "paid")
    query = query.in("status", ["paid", "fulfilled", "partially_refunded"]);
  else query = query.neq("status", "pending_payment");
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`Failed to load orders: ${error.message}`);
  return data;
}

export async function getOrderForAdmin(id: string) {
  await requireRole(STAFF_ROLES, `/admin/orders/${id}`);
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return order ? buildOrderView(supabase, order) : null;
}
