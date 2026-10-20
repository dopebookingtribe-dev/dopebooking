import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type Stripe from "stripe";
import { processEmailOutbox } from "@/lib/email/outbox";
import { getPublicEnv } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CartItem } from "@/modules/marketplace/schemas";
import { SHOP_CURRENCY } from "@/modules/marketplace/schemas";
import { reversalsForRefund, splitOrder, type SplitLine } from "./split";

// Server-only order logic. Uses the service role: callers must have checked
// who the user is (or verified a guest token) before calling these.

type Admin = ReturnType<typeof createAdminClient>;

/** Countries Stripe Checkout may ship to (EU/EEA, UK, CH and key markets). */
export const SHIPPING_COUNTRIES = [
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
  "IS",
  "LI",
  "NO",
  "CH",
  "GB",
  "US",
  "CA",
  "AU",
  "NZ",
  "IL",
  "JP",
  "BR",
  "MX",
  "IN",
  "ZA",
] as const;

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenMatches(token: string | undefined, hash: string) {
  if (!token) return false;
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

const siteUrl = () => getPublicEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

export type CheckoutResult = { url: string } | { error: string };

/**
 * Re-prices the cart from the database, checks every line can be sold and
 * paid out, records a pending order, and opens a Stripe Checkout Session.
 */
export async function createCheckout(
  items: CartItem[],
  buyer: { id: string; email: string | null } | null,
): Promise<CheckoutResult> {
  const supabase = createAdminClient();
  const variantIds = items.map((item) => item.variantId);

  const { data: variants } = await supabase
    .from("product_variants")
    .select("id, product_id, name, price_amount, stock, active")
    .in("id", variantIds);
  const { data: products } = await supabase
    .from("products")
    .select("id, title, status, product_type, currency, seller_id")
    .in("id", [
      ...new Set((variants ?? []).map((variant) => variant.product_id)),
    ]);
  const sellerIds = [
    ...new Set((products ?? []).map((product) => product.seller_id)),
  ];
  const [{ data: sellers }, { data: privates }, { data: payouts }] =
    await Promise.all([
      supabase
        .from("sellers")
        .select("id, display_name, status, shipping_flat_amount")
        .in("id", sellerIds),
      supabase
        .from("seller_private")
        .select("seller_id, commission_rate_bps")
        .in("seller_id", sellerIds),
      supabase
        .from("seller_stripe")
        .select("seller_id, stripe_account_id, transfers_status")
        .in("seller_id", sellerIds),
    ]);

  const variantById = new Map((variants ?? []).map((v) => [v.id, v]));
  const productById = new Map((products ?? []).map((p) => [p.id, p]));
  const sellerById = new Map((sellers ?? []).map((s) => [s.id, s]));
  const commissionBySeller = new Map(
    (privates ?? []).map((p) => [p.seller_id, p.commission_rate_bps]),
  );
  const payoutBySeller = new Map((payouts ?? []).map((p) => [p.seller_id, p]));

  const problems: string[] = [];
  const lines: (SplitLine & {
    variantId: string;
    productId: string;
    title: string;
    variantName: string;
  })[] = [];

  for (const item of items) {
    const variant = variantById.get(item.variantId);
    const product = variant ? productById.get(variant.product_id) : undefined;
    const seller = product ? sellerById.get(product.seller_id) : undefined;
    if (
      !variant ||
      !product ||
      !seller ||
      !variant.active ||
      product.status !== "published" ||
      seller.status !== "approved"
    ) {
      problems.push("An item in your cart is no longer available.");
      continue;
    }
    if (product.currency !== SHOP_CURRENCY) {
      problems.push(`${product.title} can't be bought right now.`);
      continue;
    }
    if (variant.stock !== null && variant.stock < item.quantity) {
      problems.push(
        variant.stock === 0
          ? `${product.title} (${variant.name}) is sold out.`
          : `Only ${variant.stock} of ${product.title} (${variant.name}) left.`,
      );
      continue;
    }
    if (payoutBySeller.get(seller.id)?.transfers_status !== "active") {
      problems.push(
        `${seller.display_name} can't take payments yet. Please remove their items or try later.`,
      );
      continue;
    }
    lines.push({
      sellerId: seller.id,
      unitPrice: variant.price_amount,
      quantity: item.quantity,
      productType: product.product_type,
      variantId: variant.id,
      productId: product.id,
      title: product.title,
      variantName: variant.name,
    });
  }
  if (problems.length) return { error: [...new Set(problems)].join(" ") };
  if (!lines.length) return { error: "Your cart is empty." };

  const split = splitOrder(
    lines,
    [...sellerById.values()].map((seller) => ({
      id: seller.id,
      shippingFlat: seller.shipping_flat_amount,
      commissionBps: commissionBySeller.get(seller.id) ?? null,
    })),
  );

  // Pending order (prices snapshotted) before talking to Stripe.
  const token = randomBytes(24).toString("base64url");
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      buyer_id: buyer?.id ?? null,
      buyer_email: buyer?.email ?? null,
      currency: SHOP_CURRENCY,
      items_total: split.itemsTotal,
      shipping_total: split.shippingTotal,
      total: split.total,
      access_token_hash: hashToken(token),
    })
    .select("id, reference")
    .single();
  if (orderError || !order)
    return { error: "Checkout failed. Please try again." };

  const { data: sellerOrders, error: soError } = await supabase
    .from("seller_orders")
    .insert(
      split.shares.map((share) => ({
        order_id: order.id,
        seller_id: share.sellerId,
        items_total: share.itemsTotal,
        shipping_amount: share.shipping,
        commission_rate_bps: share.commissionBps,
        commission_amount: share.commission,
        seller_amount: share.sellerAmount,
        stripe_account_id: payoutBySeller.get(share.sellerId)!
          .stripe_account_id,
      })),
    )
    .select("id, seller_id");
  if (soError || !sellerOrders)
    return { error: "Checkout failed. Please try again." };
  const soBySeller = new Map(sellerOrders.map((so) => [so.seller_id, so.id]));

  const { error: itemsError } = await supabase.from("order_items").insert(
    lines.map((line) => ({
      order_id: order.id,
      seller_order_id: soBySeller.get(line.sellerId)!,
      product_id: line.productId,
      variant_id: line.variantId,
      product_title: line.title,
      variant_name: line.variantName,
      product_type: line.productType,
      unit_price: line.unitPrice,
      quantity: line.quantity,
      line_total: line.unitPrice * line.quantity,
    })),
  );
  if (itemsError) return { error: "Checkout failed. Please try again." };

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = lines.map(
    (line) => ({
      quantity: line.quantity,
      price_data: {
        currency: SHOP_CURRENCY.toLowerCase(),
        unit_amount: line.unitPrice,
        product_data: {
          name: ["Standard", "Download"].includes(line.variantName)
            ? line.title
            : `${line.title} — ${line.variantName}`,
        },
      },
    }),
  );
  for (const share of split.shares) {
    if (share.shipping > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: SHOP_CURRENCY.toLowerCase(),
          unit_amount: share.shipping,
          product_data: {
            name: `Shipping — ${sellerById.get(share.sellerId)?.display_name ?? "seller"}`,
          },
        },
      });
    }
  }

  const needsShipping = lines.some((line) => line.productType === "physical");
  const session = await getStripe().checkout.sessions.create(
    {
      mode: "payment",
      // Cards (incl. Apple Pay / Google Pay) confirm instantly, so sellers
      // can be paid as soon as the session completes.
      allowed_payment_method_types: ["card"],
      line_items: lineItems,
      customer_email: buyer?.email ?? undefined,
      shipping_address_collection: needsShipping
        ? { allowed_countries: [...SHIPPING_COUNTRIES] }
        : undefined,
      client_reference_id: order.id,
      metadata: { order_id: order.id, guest_token: buyer ? "" : token },
      payment_intent_data: {
        transfer_group: order.id,
        metadata: { order_id: order.id, reference: order.reference },
        description: `DopeBooking order ${order.reference}`,
      },
      success_url: `${siteUrl()}/checkout/success?order=${order.id}&token=${token}`,
      cancel_url: `${siteUrl()}/cart`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    },
    { idempotencyKey: `checkout-${order.id}` },
  );

  await supabase
    .from("orders")
    .update({ stripe_checkout_session_id: session.id })
    .eq("id", order.id);
  if (!session.url) return { error: "Checkout failed. Please try again." };
  return { url: session.url };
}

// ---------------------------------------------------------------------------
// After payment (webhook)
// ---------------------------------------------------------------------------

async function notify(
  supabase: Admin,
  target: { userId: string | null; email: string | null },
  message: {
    type: string;
    title: string;
    body: string;
    link: string;
    template: string;
    payload: Record<string, unknown>;
  },
) {
  if (target.userId) {
    await supabase.from("notifications").insert({
      user_id: target.userId,
      type: message.type,
      title: message.title,
      body: message.body,
      link: message.link,
    });
  }
  if (target.email) {
    await supabase.from("email_outbox").insert({
      to_email: target.email,
      template: message.template,
      payload: { ...message.payload, link: message.link, title: message.title },
    });
  }
}

async function ownerContact(supabase: Admin, sellerId: string) {
  const { data: seller } = await supabase
    .from("sellers")
    .select("owner_user_id")
    .eq("id", sellerId)
    .single();
  if (!seller) return { userId: null, email: null };
  const { data } = await supabase.auth.admin.getUserById(seller.owner_user_id);
  return { userId: seller.owner_user_id, email: data.user?.email ?? null };
}

/** Marks a paid Checkout Session's order as paid and pays the sellers. */
export async function fulfilPaidSession(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.order_id ?? session.client_reference_id;
  if (!orderId || session.payment_status !== "paid") return;
  const supabase = createAdminClient();
  const stripe = getStripe();

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (!order || order.status !== "pending_payment") return; // already handled

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  if (!paymentIntentId)
    throw new Error(`Session ${session.id} has no payment intent`);
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  const chargeId =
    typeof paymentIntent.latest_charge === "string"
      ? paymentIntent.latest_charge
      : paymentIntent.latest_charge?.id;
  if (!chargeId) throw new Error(`Payment ${paymentIntentId} has no charge`);
  if ((session.amount_total ?? 0) !== order.total) {
    await supabase
      .from("orders")
      .update({ needs_attention: "Paid amount differs from order total." })
      .eq("id", order.id);
  }

  const shipping = session.collected_information?.shipping_details;
  const buyerEmail =
    order.buyer_email ?? session.customer_details?.email ?? null;
  await supabase
    .from("orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: paymentIntentId,
      stripe_charge_id: chargeId,
      buyer_email: buyerEmail,
      shipping_name: shipping?.name ?? null,
      shipping_address:
        (shipping?.address as unknown as Record<string, unknown>) ?? null,
    })
    .eq("id", order.id)
    .eq("status", "pending_payment");
  await supabase
    .from("seller_orders")
    .update({ status: "paid" })
    .eq("order_id", order.id);

  const { data: oversold } = await supabase.rpc("apply_order_stock", {
    p_order: order.id,
  });
  const attention: string[] = [];
  if (oversold)
    attention.push("Some items were oversold; check stock with the seller.");

  // Pay each seller their share from this charge.
  const { data: sellerOrders } = await supabase
    .from("seller_orders")
    .select("*")
    .eq("order_id", order.id);
  for (const so of sellerOrders ?? []) {
    if (so.stripe_transfer_id || so.seller_amount <= 0) continue;
    try {
      const transfer = await stripe.transfers.create(
        {
          amount: so.seller_amount,
          currency: order.currency.toLowerCase(),
          destination: so.stripe_account_id,
          source_transaction: chargeId,
          transfer_group: order.id,
          metadata: { order_id: order.id, seller_order_id: so.id },
        },
        { idempotencyKey: `transfer-${so.id}` },
      );
      await supabase
        .from("seller_orders")
        .update({
          stripe_transfer_id: transfer.id,
          transfer_status: "transferred",
          transfer_error: null,
        })
        .eq("id", so.id);
    } catch (error) {
      attention.push("A seller transfer failed; retry from the admin.");
      await supabase
        .from("seller_orders")
        .update({
          transfer_status: "failed",
          transfer_error: String(error).slice(0, 500),
        })
        .eq("id", so.id);
    }

    const contact = await ownerContact(supabase, so.seller_id);
    await notify(supabase, contact, {
      type: "order_new_seller",
      title: `New order ${order.reference}`,
      body: "Prepare and ship it from your dashboard.",
      link: `/dashboard/seller/orders/${so.id}`,
      template: "order_new_seller",
      payload: { reference: order.reference },
    });
  }
  if (attention.length) {
    await supabase
      .from("orders")
      .update({ needs_attention: attention.join(" ") })
      .eq("id", order.id);
  }

  const guestToken = session.metadata?.guest_token;
  await notify(
    supabase,
    { userId: order.buyer_id, email: buyerEmail },
    {
      type: "order_paid",
      title: `Order ${order.reference} confirmed`,
      body: "Thanks for your order!",
      link: order.buyer_id
        ? `/dashboard/orders/${order.id}`
        : `/orders/${order.id}?token=${guestToken ?? ""}`,
      template: "order_paid",
      payload: {
        reference: order.reference,
        total: order.total,
        currency: order.currency,
      },
    },
  );
  await processEmailOutbox().catch((error) =>
    console.error("Email outbox run failed", error),
  );
}

/** Expired or failed sessions: release the pending order. */
export async function cancelPendingSession(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.order_id ?? session.client_reference_id;
  if (!orderId) return;
  const supabase = createAdminClient();
  await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderId)
    .eq("status", "pending_payment");
  await supabase
    .from("seller_orders")
    .update({ status: "cancelled" })
    .eq("order_id", orderId)
    .eq("status", "pending");
}

/** Keeps refunded amounts in sync, including refunds made in the Stripe Dashboard. */
export async function syncChargeRefund(charge: Stripe.Charge) {
  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, total, status")
    .eq("stripe_charge_id", charge.id)
    .maybeSingle();
  if (!order) return;
  const refunded = charge.amount_refunded;
  await supabase
    .from("orders")
    .update({
      refunded_amount: refunded,
      status:
        refunded >= order.total
          ? "refunded"
          : refunded > 0
            ? "partially_refunded"
            : order.status,
    })
    .eq("id", order.id);
}

// ---------------------------------------------------------------------------
// Staff refunds
// ---------------------------------------------------------------------------

/** Refunds the buyer and takes the sellers' shares back proportionally. */
export async function refundOrder(orderId: string, amount: number) {
  const supabase = createAdminClient();
  const stripe = getStripe();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (!order?.stripe_payment_intent_id) throw new Error("Order is not paid.");
  const refundable = order.total - order.refunded_amount;
  const refund = Math.min(amount, refundable);
  if (refund <= 0) throw new Error("Nothing left to refund.");

  await stripe.refunds.create(
    {
      payment_intent: order.stripe_payment_intent_id,
      amount: refund,
      metadata: { order_id: order.id },
    },
    { idempotencyKey: `refund-${order.id}-${order.refunded_amount}-${refund}` },
  );

  const { data: sellerOrders } = await supabase
    .from("seller_orders")
    .select("*")
    .eq("order_id", order.id);
  const reversals = reversalsForRefund(
    (sellerOrders ?? []).map((so) => ({
      sellerId: so.seller_id,
      sellerAmount: so.stripe_transfer_id ? so.seller_amount : 0,
    })),
    order.refunded_amount + refund,
    order.total,
  );
  const failures: string[] = [];
  for (const so of sellerOrders ?? []) {
    const target =
      reversals.find((r) => r.sellerId === so.seller_id)?.amount ?? 0;
    if (!so.stripe_transfer_id || target <= 0) continue;
    const transfer = await stripe.transfers.retrieve(so.stripe_transfer_id);
    const toReverse = target - transfer.amount_reversed;
    if (toReverse <= 0) continue;
    try {
      await stripe.transfers.createReversal(
        so.stripe_transfer_id,
        { amount: toReverse, metadata: { order_id: order.id } },
        { idempotencyKey: `reversal-${so.id}-${target}` },
      );
    } catch (error) {
      failures.push(
        `Reversal for a seller failed: ${String(error).slice(0, 200)}`,
      );
    }
  }

  const fullyRefunded = order.refunded_amount + refund >= order.total;
  await supabase
    .from("orders")
    .update({
      refunded_amount: order.refunded_amount + refund,
      status: fullyRefunded ? "refunded" : "partially_refunded",
      needs_attention: failures.length
        ? failures.join(" ")
        : order.needs_attention,
    })
    .eq("id", order.id);
  if (fullyRefunded) {
    await supabase
      .from("seller_orders")
      .update({ status: "refunded", transfer_status: "reversed" })
      .eq("order_id", order.id);
  }
  return { refunded: refund, failures };
}

/** Retries failed seller transfers for a paid order. */
export async function retryTransfers(orderId: string) {
  const supabase = createAdminClient();
  const stripe = getStripe();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (!order?.stripe_charge_id || !["paid", "fulfilled"].includes(order.status))
    return;
  const { data: sellerOrders } = await supabase
    .from("seller_orders")
    .select("*")
    .eq("order_id", orderId)
    .eq("transfer_status", "failed");
  for (const so of sellerOrders ?? []) {
    try {
      const transfer = await stripe.transfers.create(
        {
          amount: so.seller_amount,
          currency: order.currency.toLowerCase(),
          destination: so.stripe_account_id,
          source_transaction: order.stripe_charge_id,
          transfer_group: order.id,
          metadata: { order_id: order.id, seller_order_id: so.id },
        },
        { idempotencyKey: `transfer-${so.id}` },
      );
      await supabase
        .from("seller_orders")
        .update({
          stripe_transfer_id: transfer.id,
          transfer_status: "transferred",
          transfer_error: null,
        })
        .eq("id", so.id);
    } catch (error) {
      await supabase
        .from("seller_orders")
        .update({ transfer_error: String(error).slice(0, 500) })
        .eq("id", so.id);
    }
  }
}
