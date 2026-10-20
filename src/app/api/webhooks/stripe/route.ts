import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getServerEnv, hasPayments } from "@/lib/env.server";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  cancelPendingSession,
  fulfilPaidSession,
  syncChargeRefund,
} from "@/modules/orders/server";

// Stripe webhook: the only source of truth for payment state.
// Signature-verified, idempotent (stripe_events), retried by Stripe on 5xx.
export async function POST(request: NextRequest) {
  const secret = getServerEnv().STRIPE_WEBHOOK_SECRET;
  if (!secret || !hasPayments()) {
    return NextResponse.json(
      { error: "Payments not configured" },
      { status: 503 },
    );
  }

  let event: Stripe.Event;
  try {
    const payload = await request.text();
    event = await getStripe().webhooks.constructEventAsync(
      payload,
      request.headers.get("stripe-signature") ?? "",
      secret,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: seen } = await supabase
    .from("stripe_events")
    .select("processed_at")
    .eq("id", event.id)
    .maybeSingle();
  if (seen?.processed_at)
    return NextResponse.json({ received: true, duplicate: true });
  if (!seen) {
    await supabase
      .from("stripe_events")
      .insert({ id: event.id, type: event.type });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await fulfilPaidSession(event.data.object);
        break;
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed":
        await cancelPendingSession(event.data.object);
        break;
      case "charge.refunded":
        await syncChargeRefund(event.data.object);
        break;
      default:
        break;
    }
    await supabase
      .from("stripe_events")
      .update({ processed_at: new Date().toISOString(), error: null })
      .eq("id", event.id);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Stripe webhook ${event.type} failed`, error);
    await supabase
      .from("stripe_events")
      .update({ error: String(error).slice(0, 500) })
      .eq("id", event.id);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
