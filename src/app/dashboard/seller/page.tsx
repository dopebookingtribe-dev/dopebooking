import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { EditSection, StatusBadge } from "@/components/admin/admin-ui";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
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
import { mediaFolder } from "@/modules/media/server";

export const metadata: Metadata = { title: "My shop" };

export default function SellerDashboardPage({
  searchParams,
}: PageProps<"/dashboard/seller">) {
  return (
    <Container className="py-16">
      <Meta>Dashboard</Meta>
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
