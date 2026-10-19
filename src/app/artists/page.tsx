import type { Metadata } from "next";
import { ComingSoon } from "@/components/site/coming-soon";

export const metadata: Metadata = { title: "Artists" };

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Artists"
      title="The roster is being curated."
      body="Artist profiles, media and booking requests arrive in the next release."
    />
  );
}
