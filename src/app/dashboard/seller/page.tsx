import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { EditSection, StatusBadge } from "@/components/admin/admin-ui";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { COUNTRIES } from "@/lib/countries";
import {
  registerSellerLogo,
  updateSellerProfile,
} from "@/modules/marketplace/actions";
import { SellerProfileForm } from "@/modules/marketplace/components/seller-forms";
import { SellerStatusBadge } from "@/modules/marketplace/components/seller-status-badge";
import { getMySeller } from "@/modules/marketplace/queries";
import { PRODUCT_TYPES } from "@/modules/marketplace/schemas";
import { ImageUploader } from "@/modules/media/components/image-uploader";
import { hasPayments } from "@/lib/env.server";
import {
  ActionButton,
  ShippingForm,
} from "@/modules/orders/components/seller-forms";
import { getMyPayoutStatus } from "@/modules/orders/queries";
import {
  openPayoutDashboard,
  startPayoutOnboarding,
  updateShipping,
} from "@/modules/orders/seller-actions";
import { mediaFolder } from "@/modules/media/server";

export const metadata: Metadata = { title: "My shop" };

export default function SellerDashboardPage({
  searchParams,
}: PageProps<"/dashboard/seller">) {
  return (
    <Container className="py-16">
      <Suspense
        fallback={<p className="mt-6 text-muted">Loading your shop…</p>}
      >
        <Shop searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

const STATUS_HELP = {
  pending:
    "Thanks for applying! We review new shops within a few working days and will notify you.",
  rejected:
    "Your application wasn't approved this time. Check your notifications for details.",
  suspended:
    "Your shop is paused and hidden. Check your notifications or contact us.",
  approved: null,
};

async function Shop({
  searchParams,
}: {
  searchParams: PageProps<"/dashboard/seller">["searchParams"];
}) {
  const [{ applied }, { seller, products, logo }] = await Promise.all([
    searchParams,
    getMySeller(),
  ]);

  if (!seller) {
    return (
      <>
        <h1 className="mt-3 font-display text-headline">My shop</h1>
        <p className="mt-4 max-w-lg text-muted">
          You don&apos;t have a shop yet.
        </p>
        <ButtonLink href="/sell" className="mt-8">
          Apply to sell
        </ButtonLink>
      </>
    );
  }

  return (
    <>
      {applied ? (
        <p
          role="status"
          className="mt-6 rounded-(--radius) border border-success/40 bg-surface-1 p-4 text-sm"
        >
          Application sent.
        </p>
      ) : null}
      <header className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-headline">{seller.display_name}</h1>
        <div className="flex items-center gap-4">
          <SellerStatusBadge status={seller.status} />
          {seller.status === "approved" ? (
            <Link
              href={`/shop/sellers/${seller.slug}`}
              className="text-sm underline underline-offset-4"
            >
              View storefront
            </Link>
          ) : null}
        </div>
      </header>
      {STATUS_HELP[seller.status] ? (
        <p className="mt-4 max-w-2xl text-muted">
          {STATUS_HELP[seller.status]}
        </p>
      ) : null}

      <div className="mt-12 flex flex-col gap-16">
        {seller.status === "approved" ? (
          <EditSection
            title="Products"
            description="Drafts are only visible to you."
          >
            <div className="flex flex-col gap-6">
              <ButtonLink
                href="/dashboard/seller/products/new"
                className="self-start"
              >
                New product
              </ButtonLink>
              {products.length ? (
                <ul className="divide-y divide-line border-y border-line">
                  {products.map((product) => (
                    <li key={product.id}>
                      <Link
                        href={`/dashboard/seller/products/${product.id}`}
                        className="flex flex-wrap items-center justify-between gap-3 py-3 hover:text-accent"
                      >
                        <span>
                          {product.title}
                          <span className="ml-2 text-xs text-muted">
                            {PRODUCT_TYPES[product.product_type]}
                          </span>
                        </span>
                        <StatusBadge status={product.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">No products yet.</p>
              )}
            </div>
          </EditSection>
        ) : null}

        {seller.status === "approved" ? (
          <>
            <EditSection
              title="Orders"
              description="Paid orders to prepare and ship."
            >
              <ButtonLink href="/dashboard/seller/orders" variant="secondary">
                View orders
              </ButtonLink>
            </EditSection>
            <EditSection
              title="Payouts"
              description="Get paid by Stripe. Buyers can only check out your products once this is active."
            >
              <Suspense
                fallback={<p className="text-sm text-muted">Loading…</p>}
              >
                <Payouts />
              </Suspense>
            </EditSection>
            <EditSection title="Shipping" description="One flat fee per order.">
              <ShippingForm
                action={updateShipping}
                current={seller.shipping_flat_amount}
              />
            </EditSection>
          </>
        ) : null}

        <EditSection
          title="Shop profile"
          description="Shown on your storefront."
        >
          <SellerProfileForm
            action={updateSellerProfile}
            seller={seller}
            countries={COUNTRIES}
          />
        </EditSection>

        <EditSection
          title="Logo"
          description="Square images work best. Uploading replaces the current logo."
        >
          <div className="flex flex-col gap-6">
            {logo ? (
              <div className="relative size-24 overflow-hidden rounded-full bg-surface-2">
                <Image
                  src={logo.url}
                  alt={logo.alt}
                  fill
                  sizes="6rem"
                  className="object-cover"
                />
              </div>
            ) : null}
            <ImageUploader
              folder={mediaFolder("seller", seller.id)}
              register={registerSellerLogo}
              defaultAlt={`${seller.display_name} logo`}
            />
          </div>
        </EditSection>
      </div>
    </>
  );
}

async function Payouts() {
  if (!hasPayments()) {
    return (
      <p className="text-sm text-muted">
        Payments aren&apos;t switched on yet.
      </p>
    );
  }
  const payout = await getMyPayoutStatus();
  const status = payout?.transfers_status ?? "not_started";
  const text: Record<string, string> = {
    not_started: "Not set up yet.",
    pending: "Stripe is checking your details.",
    active: "Active: you can receive payments.",
    restricted: "Stripe needs more information.",
    rejected: "Stripe couldn't approve this account.",
    unsupported: "Payouts aren't available in your country yet.",
  };
  return (
    <div className="flex flex-col gap-4">
      <p className={status === "active" ? "text-success" : "text-muted"}>
        {text[status] ?? status}
        {payout?.requirements_due
          ? ` (${payout.requirements_due} item(s) to complete)`
          : ""}
      </p>
      <div className="flex flex-wrap gap-3">
        {status !== "active" ? (
          <ActionButton action={startPayoutOnboarding}>
            {payout ? "Continue payout setup" : "Set up payouts"}
          </ActionButton>
        ) : null}
        {payout ? (
          <ActionButton action={openPayoutDashboard} variant="secondary">
            Open Stripe dashboard
          </ActionButton>
        ) : null}
      </div>
    </div>
  );
}
