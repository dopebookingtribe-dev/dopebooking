import type { Metadata } from "next";
import { ComingSoon } from "@/components/site/coming-soon";

export const metadata: Metadata = {
  title: "Request a booking",
  robots: { index: false },
};

// Replaced by the booking request form in Phase 05.
export default function BookArtistPage() {
  return (
    <ComingSoon
      eyebrow="Booking"
      title="Booking requests open soon."
      body="Online booking requests launch in the next release. Create an account now and you'll be ready to send your first request."
    />
  );
}
