import "server-only";
import { getPublicEnv } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Seller payout accounts: Stripe Accounts v2 with the Recipient
// configuration (they receive transfers; the platform is merchant of record)
// and the Express Dashboard. Stripe collects identity (KYC) details.

const siteUrl = () => getPublicEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

export async function getOrCreatePayoutAccount(seller: {
  id: string;
  display_name: string;
  country: string | null;
  website: string | null;
  ownerEmail: string | null;
}) {
  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("seller_stripe")
    .select("stripe_account_id")
    .eq("seller_id", seller.id)
    .maybeSingle();
  if (existing) return existing.stripe_account_id;
  if (!seller.country)
    throw new Error("Set your country in the shop profile first.");

  const account = await getStripe().v2.core.accounts.create(
    {
      display_name: seller.display_name,
      contact_email: seller.ownerEmail ?? undefined,
      dashboard: "express",
      identity: { country: seller.country.toLowerCase() },
      configuration: {
        recipient: {
          capabilities: {
            stripe_balance: { stripe_transfers: { requested: true } },
          },
        },
      },
      defaults: {
        currency: "eur",
        // The platform charges buyers, so it carries fees and losses.
        responsibilities: {
          fees_collector: "application",
          losses_collector: "application",
        },
        profile: {
          business_url: seller.website ?? `${siteUrl()}/shop`,
          product_description:
            "Festival and psytrance products sold on DopeBooking",
        },
      },
      metadata: { seller_id: seller.id },
    },
    { idempotencyKey: `payout-account-${seller.id}` },
  );

  await supabase.from("seller_stripe").insert({
    seller_id: seller.id,
    stripe_account_id: account.id,
    transfers_status: "pending",
    payouts_status: null,
    requirements_due: 0,
  });
  return account.id;
}

export async function createOnboardingLink(accountId: string) {
  const link = await getStripe().v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        refresh_url: `${siteUrl()}/dashboard/seller/payouts/refresh`,
        return_url: `${siteUrl()}/dashboard/seller/payouts/return`,
      },
    },
  });
  return link.url;
}

/** Pulls the latest capability status from Stripe into seller_stripe. */
export async function refreshPayoutStatus(sellerId: string) {
  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("seller_stripe")
    .select("stripe_account_id")
    .eq("seller_id", sellerId)
    .maybeSingle();
  if (!row) return null;
  const account = await getStripe().v2.core.accounts.retrieve(
    row.stripe_account_id,
    {
      include: ["configuration.recipient", "requirements"],
    },
  );
  const balance =
    account.configuration?.recipient?.capabilities?.stripe_balance;
  const status = {
    transfers_status: balance?.stripe_transfers?.status ?? "pending",
    payouts_status: balance?.payouts?.status ?? null,
    requirements_due: account.requirements?.entries?.length ?? 0,
  };
  await supabase.from("seller_stripe").update(status).eq("seller_id", sellerId);
  return status;
}

export async function createDashboardLink(accountId: string) {
  const link = await getStripe().accounts.createLoginLink(accountId);
  return link.url;
}
