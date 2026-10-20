import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
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
      <h1 className="max-w-4xl font-display text-display">
        Everything around the dancefloor.
      </h1>
      <p className="mt-6 max-w-xl text-lg text-muted">
        Beyond booking artists, we run the parts that make a festival weekend
        work. Tell us what you need and get a quote.
      </p>
      <ul className="mt-16 border-t border-line">
        {(Object.entries(OFFERS) as [Offer, (typeof OFFERS)[Offer]][]).map(
          ([key, offer]) => (
            <li key={key}>
              <Link
                href={`/services/${key}`}
                className="group grid gap-3 border-b border-line py-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-10"
              >
                <h2 className="font-display text-3xl transition-colors group-hover:text-accent sm:text-4xl">
                  {offer.title}
                </h2>
                <div>
                  <p className="max-w-[60ch] text-muted">{offer.pitch}</p>
                  <span className="mt-4 inline-block text-sm font-semibold text-accent underline underline-offset-4">
                    Request a quote
                  </span>
                </div>
              </Link>
            </li>
          ),
        )}
      </ul>
    </Container>
  );
}
