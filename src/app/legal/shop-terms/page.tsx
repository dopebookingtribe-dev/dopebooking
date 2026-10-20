import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Shop terms",
  alternates: { canonical: "/legal/shop-terms" },
};

export default function ShopTermsPage() {
  return (
    <LegalPage title="Shop terms" updated="20 October 2026">
      <p>
        The DopeBooking shop is a marketplace. Products are offered by
        independent sellers shown on each product page. [LAWYER TO CONFIRM: who
        is the contracting party for each sale, given that DopeBooking collects
        payment.]
      </p>
      <h2>Ordering and payment</h2>
      <p>
        Prices include VAT where applicable; shipping is shown before you pay.
        Payment is processed by Stripe. Your order is confirmed when payment
        succeeds; you receive a confirmation email.
      </p>
      <h2>Delivery</h2>
      <p>
        Each seller ships their items separately and adds tracking where
        available. Digital products are available to download from your order
        page right after payment.
      </p>
      <h2>Right of withdrawal (consumers in the EU)</h2>
      <p>
        You can withdraw from a purchase of physical goods within 14 days of
        receiving them, without giving a reason. To withdraw, contact [CONTACT
        EMAIL] with your order reference. [LAWYER: add the full statutory
        withdrawal notice and model withdrawal form; returns address and who
        pays return shipping.]
      </p>
      <p>
        For digital content, the right of withdrawal ends when the download
        starts, if you agreed to immediate delivery and acknowledged losing the
        right. [LAWYER: confirm the consent wording at checkout.]
      </p>
      <h2>Refunds</h2>
      <p>
        Refunds go back to the original payment method, usually within a few
        working days.
      </p>
      <h2>Problems with an order</h2>
      <p>
        Contact us at [CONTACT EMAIL] with your order reference and we&apos;ll
        help sort it out with the seller.
      </p>
    </LegalPage>
  );
}
