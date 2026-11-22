import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { CmsLegal } from "@/modules/legal/components/cms-legal";

export const metadata: Metadata = {
  title: "Music seller terms",
  alternates: { canonical: "/legal/music-seller-terms" },
};

export default function MusicSellerTermsPage() {
  return (
    <CmsLegal doc="music-seller-terms">
      <LegalPage title="Music seller terms" updated="3 November 2026">
        <p>
          These terms apply when a DopeBooking artist (or their team) sells
          music through the DopeBooking music store. You accept them each time
          you send a release for review.
        </p>
        <h2>Your rights and promises</h2>
        <ul>
          <li>
            You own or control all rights in each release: the recordings, the
            compositions, every sample, and the artwork, or you have the
            licences needed to sell them as downloads worldwide.
          </li>
          <li>
            Nothing in a release infringes anyone&apos;s rights or the law, and
            the details you give (titles, credits, ISRCs) are correct.
          </li>
          <li>
            If someone claims otherwise, you help us resolve it and cover the
            costs caused by a breach of these promises. [LAWYER: indemnity
            scope.]
          </li>
        </ul>
        <h2>What you allow us to do</h2>
        <p>
          You give DopeBooking a non-exclusive, worldwide licence, for as long
          as a release is in the store, to store your files, sell downloads to
          buyers under our <a href="/legal/music-license">music licence</a>,
          publish short preview clips, and use the title, artwork and your
          artist name to present and promote the release. You keep all your
          rights and may sell your music elsewhere too.
        </p>
        <h2>Review</h2>
        <p>
          We review every release before it goes live and may decline, ask for
          changes or remove a release, for example for rights concerns, quality
          or misleading information.
        </p>
        <h2>Prices, commission and earnings</h2>
        <ul>
          <li>You set the price of each release.</li>
          <li>
            We keep a commission on each sale, currently [15] % unless agreed
            otherwise in writing. Payment processing fees are covered by our
            commission.
          </li>
          <li>
            Your share is credited to your balance only after the payment is
            confirmed. It becomes available to withdraw after a hold period,
            currently [14] days, which covers refunds and chargebacks.
          </li>
          <li>
            If a sale is refunded or charged back, the matching part of your
            share is deducted from your balance.
          </li>
        </ul>
        <h2>Payouts</h2>
        <p>
          You can request a payout of your available balance once it reaches the
          minimum, currently €[20.00]. We review requests and pay by bank
          transfer to the account you entered, usually within [5] working days
          of approval. You are responsible for taxes on your income. [TAX
          ADVISOR: VAT on digital sales (OSS), artist self-billing invoices and
          DAC7 reporting.]
        </p>
        <h2>Ending</h2>
        <p>
          You can unpublish a release at any time; buyers keep access to what
          they already bought. Earned balances are paid out under these terms
          after the hold period.
        </p>
      </LegalPage>
    </CmsLegal>
  );
}
