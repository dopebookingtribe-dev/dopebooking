import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Seller terms",
  alternates: { canonical: "/legal/seller-terms" },
};

export default function SellerTermsPage() {
  return (
    <LegalPage title="Seller terms" updated="20 October 2026">
      <h2>Opening a shop</h2>
      <p>
        We review every application and may decline or pause a shop, for example
        for unlawful, counterfeit or misleading products. You must be allowed to
        sell what you list.
      </p>
      <h2>Payments and commission</h2>
      <p>
        Buyers pay through the platform. After a successful payment we transfer
        your share to your Stripe account: the item price minus our commission
        (currently [15] % unless agreed otherwise), plus your shipping fee.
        Payment processing fees are covered by our commission. Stripe pays out
        to your bank account on its schedule.
      </p>
      <h2>Your obligations</h2>
      <ul>
        <li>Describe products accurately and keep stock up to date.</li>
        <li>Ship within [3] working days and add tracking where possible.</li>
        <li>Honour statutory withdrawal and warranty rights of consumers.</li>
        <li>
          Handle your own taxes on your income. [LAWYER/TAX ADVISOR: VAT and
          marketplace reporting (DAC7).]
        </li>
      </ul>
      <h2>Refunds and disputes</h2>
      <p>
        If an order is refunded or a payment is disputed, we may take back the
        corresponding share from your Stripe balance.
      </p>
      <h2>Ending</h2>
      <p>
        You can close your shop at any time; open orders must still be
        fulfilled.
      </p>
    </LegalPage>
  );
}
