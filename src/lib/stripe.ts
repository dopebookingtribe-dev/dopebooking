import "server-only";
import Stripe from "stripe";
import { getServerEnv } from "@/lib/env.server";

let client: Stripe | undefined;

/** Server-side Stripe client (API version pinned by the SDK). */
export function getStripe() {
  const key = getServerEnv().STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  client ??= new Stripe(key, {
    appInfo: { name: "DopeBooking" },
    maxNetworkRetries: 2,
    timeout: 20_000,
  });
  return client;
}
