import type { Metadata } from "next";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { getCurrentUser } from "@/lib/auth/dal";
import { COUNTRIES } from "@/lib/countries";
import { applyToSell } from "@/modules/marketplace/actions";
import { SellerApplicationForm } from "@/modules/marketplace/components/seller-forms";
import { SellerStatusBadge } from "@/modules/marketplace/components/seller-status-badge";
import { getMySeller } from "@/modules/marketplace/queries";

export const metadata: Metadata = {
  title: "Sell with us",
  description:
    "Open a shop on DopeBooking for festival fashion, art, music and gear.",
  alternates: { canonical: "/sell" },
};

const POINTS = [
  [
    "Reach the scene",
    "Your products next to the artists and festivals your customers already follow.",
  ],
  [
    "Curated, not crowded",
    "We review every shop, so the marketplace stays worth browsing.",
  ],
  [
    "Simple selling",
    "Add products, options and photos from your dashboard. Payments and payouts arrive soon.",
  ],
];

export default function SellPage() {
  return (
    <Container className="py-16 sm:py-24">
      <h1 className="max-w-4xl font-display text-display">
        Sell to the psytrance world.
      </h1>
      <ul className="mt-12 grid gap-8 sm:grid-cols-3">
        {POINTS.map(([title, body]) => (
          <li key={title}>
            <h2 className="font-display text-3xl">{title}</h2>
            <p className="mt-2 text-muted">{body}</p>
          </li>
        ))}
      </ul>
      <section
        aria-labelledby="apply-heading"
        className="mt-20 max-w-3xl border-t border-line pt-12"
      >
        <h2 id="apply-heading" className="font-display text-headline">
          Apply to open a shop
        </h2>
        <Suspense fallback={<p className="mt-8 text-muted">Loading…</p>}>
          <ApplyArea />
        </Suspense>
      </section>
    </Container>
  );
}

async function ApplyArea() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="mt-8">
        <p className="max-w-lg text-lg text-muted">
          Create a free account or sign in to apply.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/signup?next=%2Fsell">Create account</ButtonLink>
          <ButtonLink href="/login?next=%2Fsell" variant="secondary">
            Sign in
          </ButtonLink>
        </div>
      </div>
    );
  }
  const { seller } = await getMySeller();
  if (seller) {
    return (
      <div className="mt-8 flex flex-col items-start gap-6">
        <p className="flex items-center gap-3 text-lg">
          {seller.display_name} <SellerStatusBadge status={seller.status} />
        </p>
        <ButtonLink href="/dashboard/seller">
          Go to your shop dashboard
        </ButtonLink>
      </div>
    );
  }
  return (
    <div className="mt-10">
      <SellerApplicationForm action={applyToSell} countries={COUNTRIES} />
    </div>
  );
}
