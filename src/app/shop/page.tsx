import type { Metadata } from "next";
import { ComingSoon } from "@/components/site/coming-soon";

export const metadata: Metadata = { title: "Shop" };

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Shop"
      title="The marketplace opens later."
      body="Merch and digital releases from our artists and vendors are coming."
    />
  );
}
