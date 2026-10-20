import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy policy",
  alternates: { canonical: "/legal/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="20 October 2026">
      <p>
        This policy explains what personal data DopeBooking processes, why, and
        your rights under the EU General Data Protection Regulation (GDPR).
      </p>

      <h2>Controller</h2>
      <p>
        [COMPANY NAME], [ADDRESS], Germany. Email: [PRIVACY EMAIL]. See the{" "}
        <Link href="/legal/imprint">imprint</Link>.
      </p>

      <h2>What we process and why</h2>
      <ul>
        <li>
          <strong>Your account</strong> (email, name, password hash, roles): to
          provide the account and dashboard. Basis: contract (Art. 6(1)(b)
          GDPR).
        </li>
        <li>
          <strong>Booking and service requests</strong> (event details, budget,
          messages, optional phone number): to answer and handle your request.
          Basis: contract and pre-contractual steps (Art. 6(1)(b)).
        </li>
        <li>
          <strong>Orders</strong> (items, amounts, email, shipping address): to
          process purchases, deliver goods and meet tax and accounting duties.
          Basis: contract and legal obligation (Art. 6(1)(b), (c)). Sellers
          receive the shipping details they need to ship your order.
        </li>
        <li>
          <strong>Seller and artist information</strong> shown publicly
          (profiles, photos, products): to run the marketplace and roster.
          Basis: contract.
        </li>
        <li>
          <strong>Technical data</strong> (IP address, browser, time) in server
          logs: for security and to fix errors. Basis: legitimate interests
          (Art. 6(1)(f)). Kept for up to [14] days.
        </li>
      </ul>

      <h2>Service providers (processors)</h2>
      <ul>
        <li>
          <strong>Supabase</strong> (database, sign-in, file storage), servers
          in Frankfurt, Germany.
        </li>
        <li>
          <strong>Vercel</strong> (website hosting and delivery). Data may be
          processed outside the EU under the EU Standard Contractual Clauses /
          EU-US Data Privacy Framework.
        </li>
        <li>
          <strong>Stripe</strong> (payments and seller payouts). Stripe
          processes payment data as an independent controller for its own legal
          duties; see stripe.com/privacy.
        </li>
        <li>
          <strong>Resend</strong> (sending transactional emails such as
          confirmations).
        </li>
      </ul>
      <p>
        We have data processing agreements with our processors where required.
      </p>

      <h2>Videos</h2>
      <p>
        Videos are hosted by YouTube (privacy-enhanced mode), Vimeo
        (do-not-track), Mux or Cloudflare. Nothing is loaded from these
        providers until you press play. When you do, the provider receives your
        IP address and browser data.
      </p>

      <h2>Cookies and storage</h2>
      <p>
        We only use what the site needs to work: a sign-in session cookie and
        your shopping cart saved in your browser. We use no analytics or
        advertising cookies, so we don&apos;t ask for consent. Details:{" "}
        <Link href="/legal/cookies">cookies</Link>.
      </p>

      <h2>How long we keep data</h2>
      <p>
        Account data until you delete your account. Requests and messages for
        [3] years after the last activity. Order and invoice data for the
        periods required by German commercial and tax law (up to 10 years).
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask for access, correction, deletion, restriction, data
        portability, and object to processing based on legitimate interests.
        Email [PRIVACY EMAIL]. You can also complain to a data protection
        supervisory authority, for example [RESPONSIBLE STATE AUTHORITY].
      </p>
    </LegalPage>
  );
}
