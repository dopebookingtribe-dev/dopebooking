import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  AdminHeader,
  EditSection,
  StatusBadge,
} from "@/components/admin/admin-ui";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { countryName } from "@/lib/countries";
import {
  archiveProductAsStaff,
  reviewSeller,
} from "@/modules/marketplace/actions";
import { ReviewSellerForm } from "@/modules/marketplace/components/seller-forms";
import { SellerStatusBadge } from "@/modules/marketplace/components/seller-status-badge";
import { getSellerForAdmin } from "@/modules/marketplace/queries";

export const metadata: Metadata = { title: "Seller" };

export default function AdminSellerPage({
  params,
}: PageProps<"/admin/sellers/[id]">) {
  return (
    <Container className="py-12">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Detail params={params} />
      </Suspense>
    </Container>
  );
}

async function Detail({
  params,
}: {
  params: PageProps<"/admin/sellers/[id]">["params"];
}) {
  const { id } = await params;
  const data = await getSellerForAdmin(id);
  if (!data) notFound();
  const { seller, privateInfo, products, ownerName } = data;

  return (
    <>
      <AdminHeader
        title={seller.display_name}
        eyebrow="Seller"
        backHref="/admin/sellers"
        backLabel="All sellers"
      >
        <SellerStatusBadge status={seller.status} />
        {seller.status === "approved" ? (
          <Link
            href={`/shop/sellers/${seller.slug}`}
            className="text-sm underline underline-offset-4"
          >
            View storefront
          </Link>
        ) : null}
      </AdminHeader>
      <div className="mt-12 flex flex-col gap-16">
        <EditSection
          title="Application"
          description={`Account: ${ownerName ?? "Unknown"}.`}
        >
          <dl className="divide-y divide-line border-y border-line text-sm">
            {[
              ["Based in", countryName(seller.country)],
              ["Website", seller.website],
              ["About", seller.bio],
              ["What they'll sell", privateInfo?.application_note],
              ["Last review note", privateInfo?.review_note],
            ]
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[10rem_1fr] gap-4 py-3"
                >
                  <dt className="text-muted">{label}</dt>
                  <dd className="break-words whitespace-pre-line">{value}</dd>
                </div>
              ))}
          </dl>
        </EditSection>
        <EditSection
          title="Decision"
          description="Approving grants the seller role; any other status removes it and hides the shop."
        >
          <ReviewSellerForm
            key={seller.status}
            action={reviewSeller.bind(null, seller.id)}
            current={seller.status}
            commissionBps={privateInfo?.commission_rate_bps ?? null}
          />
        </EditSection>
        <EditSection
          title={`Products (${products.length})`}
          description="Archive anything that breaks the rules."
        >
          {products.length ? (
            <ul className="divide-y divide-line border-y border-line">
              {products.map((product) => (
                <li
                  key={product.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                >
                  <span>
                    {product.status === "published" ? (
                      <Link
                        href={`/shop/${product.slug}`}
                        className="underline underline-offset-4"
                      >
                        {product.title}
                      </Link>
                    ) : (
                      product.title
                    )}
                  </span>
                  <span className="flex items-center gap-3">
                    <StatusBadge status={product.status} />
                    {product.status !== "archived" ? (
                      <form
                        action={archiveProductAsStaff.bind(null, product.id)}
                      >
                        <ConfirmSubmit
                          message="Archive this product? It disappears from the shop."
                          className={buttonClasses(
                            "ghost",
                            "min-h-9 px-3 text-xs",
                          )}
                        >
                          Archive
                        </ConfirmSubmit>
                      </form>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No products yet.</p>
          )}
          <Meta className="mt-6">
            Commission in effect:{" "}
            {privateInfo?.commission_rate_bps != null
              ? `${privateInfo.commission_rate_bps / 100}%`
              : "default"}
          </Meta>
        </EditSection>
      </div>
    </>
  );
}
