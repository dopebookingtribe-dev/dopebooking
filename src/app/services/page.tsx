import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { OFFERS, type Offer } from "@/modules/services/schemas";

export const metadata: Metadata = {
  title: "Festival services",
  description:
    "Event promotion, festival catering, and photo, video and aftermovie production.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <Container className="py-16 sm:py-24">
      <Meta>Services</Meta>
      <h1 className="mt-4 max-w-4xl font-display text-display">
        Everything around the dancefloor.
      </h1>
      <p className="mt-6 max-w-xl text-lg text-muted">
        Beyond booking artists, we run the parts that make a festival weekend
        work. Tell us what you need and get a quote.
      </p>
      <ul className="mt-16 grid gap-px overflow-hidden rounded-(--radius) border border-line bg-line md:grid-cols-3">
        {(Object.entries(OFFERS) as [Offer, (typeof OFFERS)[Offer]][]).map(
          ([key, offer], index) => (
            <li key={key} className="bg-bg">
              <Link
                href={`/services/${key}`}
                className="group flex h-full flex-col p-8 transition-colors hover:bg-surface-1"
              >
                <Meta>0{index + 1}</Meta>
                <h2 className="mt-10 font-display text-4xl transition-colors group-hover:text-accent">
                  {offer.title}
                </h2>
                <p className="mt-4 text-muted">{offer.pitch}</p>
                <span className="mt-auto pt-8 text-sm text-text underline underline-offset-4">
                  Request a quote →
                </span>
              </Link>
            </li>
          ),
        )}
      </ul>
    </Container>
  );
}
