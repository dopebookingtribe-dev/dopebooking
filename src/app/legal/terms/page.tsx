import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of use",
  alternates: { canonical: "/legal/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="20 October 2026">
      <p>
        These terms apply to using dopebooking.com (the &quot;platform&quot;),
        operated by [COMPANY NAME] (&quot;we&quot;). Shop purchases also follow
        the <Link href="/legal/shop-terms">shop terms</Link>; sellers also
        accept the <Link href="/legal/seller-terms">seller terms</Link>.
      </p>
      <h2>Accounts</h2>
      <p>
        You must give accurate information and keep your password safe.
        You&apos;re responsible for activity on your account. We may suspend
        accounts that break these terms or the law.
      </p>
      <h2>Artist booking requests</h2>
      <p>
        Sending a booking request is free and non-binding. A booking only
        becomes binding when both sides sign a separate written booking
        agreement, which sets fees, deposits, riders, travel and cancellation
        terms. Quotes in the platform are offers to negotiate, not contracts.
      </p>
      <h2>Festival services</h2>
      <p>
        Promotion, catering and production requests work the same way: a request
        and a quote are not binding. When you accept a quote in your dashboard,
        we confirm the details with you and the provider in a written service
        agreement before work starts.
      </p>
      <h2>Content</h2>
      <p>
        You keep the rights to content you upload and grant us a licence to show
        it on the platform for its purpose. Don&apos;t upload anything you
        don&apos;t have the rights to, or anything unlawful.
      </p>
      <h2>Liability</h2>
      <p>
        We are fully liable for intent and gross negligence and for injury to
        life, body or health. For slight negligence we are liable only for
        breach of essential contractual obligations, limited to typical,
        foreseeable damage. Mandatory statutory liability (e.g. product
        liability) is unaffected.
      </p>
      <h2>Law</h2>
      <p>
        German law applies, excluding the UN Convention on the International
        Sale of Goods. If you are a consumer, mandatory consumer protection
        rules of your country of residence still apply.
      </p>
    </LegalPage>
  );
}
