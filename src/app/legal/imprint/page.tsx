import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Imprint (Impressum)",
  alternates: { canonical: "/legal/imprint" },
};

// Required in Germany (§ 5 DDG, § 18 MStV). Fill in every [PLACEHOLDER].
export default function ImprintPage() {
  return (
    <LegalPage title="Imprint (Impressum)" updated="20 October 2026">
      <h2>Provider</h2>
      <p>
        [COMPANY NAME AND LEGAL FORM]
        <br />
        [STREET AND NUMBER]
        <br />
        [POSTCODE] [CITY], Germany
      </p>
      <p>
        Represented by: [MANAGING DIRECTOR / OWNER]
        <br />
        Commercial register: [REGISTER COURT], [REGISTER NUMBER]
        <br />
        VAT ID (§ 27a UStG): [DE…]
      </p>
      <h2>Contact</h2>
      <p>
        Email: [CONTACT EMAIL]
        <br />
        Phone: [PHONE NUMBER]
      </p>
      <h2>Responsible for content (§ 18 Abs. 2 MStV)</h2>
      <p>[NAME], [ADDRESS AS ABOVE]</p>
      <h2>Online dispute resolution</h2>
      <p>
        We are not obliged and not willing to take part in dispute resolution
        proceedings before a consumer arbitration board.
      </p>
    </LegalPage>
  );
}
