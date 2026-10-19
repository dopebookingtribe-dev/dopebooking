import type { Metadata } from "next";
import { ComingSoon } from "@/components/site/coming-soon";

export const metadata: Metadata = { title: "Events" };

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Events"
      title="Upcoming events, soon."
      body="Event listings and lineups arrive in a later release."
    />
  );
}
