"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { sendQueuedEmailsAfterResponse } from "@/lib/email/after";
import { hasPayments } from "@/lib/env.server";
import {
  failedForm,
  invalidForm,
  savedForm,
  type FormState,
} from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { parsePriceToCents } from "@/modules/marketplace/schemas";
import { SHOP_TAG } from "@/modules/marketplace/queries";
import { workflowErrorMessage } from "@/modules/workflow/constants";
import {
  createDashboardLink,
  createOnboardingLink,
  getOrCreatePayoutAccount,
} from "./payouts";

async function myApprovedSeller() {
  const user = await requireUser("/dashboard/seller");
  const supabase = await createClient();
  const { data: seller } = await supabase
    .from("sellers")
    .select("id, display_name, country, website, status")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  return { user, seller: seller?.status === "approved" ? seller : null };
}

export async function startPayoutOnboarding(): Promise<FormState> {
  if (!hasPayments())
    return { status: "error", message: "Payments aren't switched on yet." };
  const { user, seller } = await myApprovedSeller();
  if (!seller)
    return {
      status: "error",
      message: "Your shop needs to be approved first.",
    };
  if (!seller.country) {
    return {
      status: "error",
      message: "Choose your country in the shop profile first.",
    };
  }
  let url: string;
  try {
    const accountId = await getOrCreatePayoutAccount({
      ...seller,
      ownerEmail: user.email,
    });
    url = await createOnboardingLink(accountId);
  } catch (error) {
    console.error("Payout onboarding failed", error);
    return {
      status: "error",
      message:
        "Stripe couldn't start the setup. Check your country is supported, or try again later.",
    };
  }
  redirect(url);
}

export async function openPayoutDashboard(): Promise<FormState> {
  const { seller } = await myApprovedSeller();
  if (!seller) return { status: "error", message: "No active shop." };
  const supabase = await createClient();
  const { data: payout } = await supabase
    .from("seller_stripe")
    .select("stripe_account_id")
    .eq("seller_id", seller.id)
    .maybeSingle();
  if (!payout) return { status: "error", message: "Set up payouts first." };
  let url: string;
  try {
    url = await createDashboardLink(payout.stripe_account_id);
  } catch {
    return { status: "error", message: "Finish the payout setup first." };
  }
  redirect(url);
}

const shippingSchema = z.object({
  shipping: z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (value === "" || value === "0") return 0;
      const cents = parsePriceToCents(value);
      if (cents === null || cents > 100000) {
        ctx.addIssue({
          code: "custom",
          message: "Enter an amount like 5 or 5.90 (max €1000).",
        });
        return z.NEVER;
      }
      return cents;
    }),
});

export async function updateShipping(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser("/dashboard/seller");
  const parsed = shippingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);
  const supabase = await createClient();
  const { error } = await supabase
    .from("sellers")
    .update({ shipping_flat_amount: parsed.data.shipping })
    .eq("owner_user_id", user.id);
  if (error) return failedForm(formData);
  updateTag(SHOP_TAG);
  return savedForm(formData);
}

const shippedSchema = z.object({
  carrier: z.string().trim().max(60),
  tracking: z.string().trim().max(100),
});

export async function markShipped(
  sellerOrderId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser(`/dashboard/seller/orders/${sellerOrderId}`);
  const parsed = shippedSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalidForm(parsed.error, formData);
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_seller_order_shipped", {
    p_seller_order: sellerOrderId,
    p_carrier: parsed.data.carrier,
    p_tracking: parsed.data.tracking,
  });
  if (error) return { status: "error", message: workflowErrorMessage(error) };
  sendQueuedEmailsAfterResponse();
  return {
    status: "success",
    message: "Marked as shipped. The buyer has been notified.",
  };
}
