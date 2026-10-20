import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { refreshPayoutStatus } from "@/modules/orders/payouts";

// Stripe sends sellers here after onboarding; we re-read their status.
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
  if (seller) await refreshPayoutStatus(seller.id).catch(() => null);
  return NextResponse.redirect(
    new URL("/dashboard/seller?payouts=updated", request.url),
  );
}
