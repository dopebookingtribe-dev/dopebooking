import type { Metadata } from "next";
import { ComingSoon } from "@/components/site/coming-soon";

export const metadata: Metadata = { title: "Media" };

export default function Page() {
  return (
    <ComingSoon
      eyebrow="Media"
      title="Galleries are on their way."
      body="Festival photography and aftermovies arrive in a later release."
    />
  );
}
