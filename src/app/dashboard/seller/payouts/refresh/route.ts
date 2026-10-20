import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { createOnboardingLink } from "@/modules/orders/payouts";

// Expired or reused onboarding links land here: issue a fresh one.
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.redirect(
      new URL("/login?next=%2Fdashboard%2Fseller", request.url),
    );
  const supabase = await createClient();
  const { data: seller } = await supabase
    .from("sellers")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  const { data: payout } = seller
    ? await supabase
        .from("seller_stripe")
        .select("stripe_account_id")
        .eq("seller_id", seller.id)
        .maybeSingle()
    : { data: null };
  if (!payout)
    return NextResponse.redirect(new URL("/dashboard/seller", request.url));
  try {
    return NextResponse.redirect(
      await createOnboardingLink(payout.stripe_account_id),
    );
  } catch {
    return NextResponse.redirect(
      new URL("/dashboard/seller?payouts=error", request.url),
    );
  }
}
