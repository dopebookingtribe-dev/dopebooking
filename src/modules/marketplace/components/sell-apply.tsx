import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { getCurrentUser } from "@/lib/auth/dal";
import { COUNTRIES } from "@/lib/countries";
import { applyToSell } from "../actions";
import { getMySeller } from "../queries";
import { SellerApplicationForm } from "./seller-forms";
import { SellerStatusBadge } from "./seller-status-badge";

export function SellApply({ children }: { children: React.ReactNode }) {
  return (
    <Container className="py-16 sm:py-24">
      <div className="max-w-3xl border-t border-line pt-12">
        <h2 className="font-display text-headline">Apply to open a shop</h2>
        {children}
      </div>
    </Container>
  );
}

export async function SellApplyArea() {
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
