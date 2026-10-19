import type { Metadata } from "next";
import { ComingSoon } from "@/components/site/coming-soon";

export const metadata: Metadata = { title: "Services" };

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Services"
      title="Festival services."
      body="Promotion, catering and production requests arrive in a later release."
    />
  );
}
