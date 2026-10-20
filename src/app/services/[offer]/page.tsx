import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { getCurrentUser } from "@/lib/auth/dal";
import { COUNTRIES } from "@/lib/countries";
import { createServiceRequest } from "@/modules/services/actions";
import { ServiceRequestForm } from "@/modules/services/components/service-request-form";
import { isOffer, OFFERS } from "@/modules/services/schemas";

type Props = PageProps<"/services/[offer]">;

export function generateStaticParams() {
  return Object.keys(OFFERS).map((offer) => ({ offer }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { offer } = await params;
  if (!isOffer(offer)) return { title: "Not found" };
  return {
    title: OFFERS[offer].title,
    description: OFFERS[offer].pitch,
    alternates: { canonical: `/services/${offer}` },
  };
}

export default async function OfferPage({ params }: Props) {
  const { offer } = await params;
  if (!isOffer(offer)) notFound();
  const details = OFFERS[offer];

  return (
    <Container className="py-16 sm:py-24">
      <Link href="/services" className="text-sm text-muted hover:text-text">
        ← All services
      </Link>
      <Meta className="mt-8">{details.eyebrow}</Meta>
      <h1 className="mt-4 max-w-4xl font-display text-display">
        {details.title}
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-muted">{details.pitch}</p>

      <section
        aria-labelledby="request-heading"
        className="mt-20 max-w-3xl border-t border-line pt-12"
      >
        <h2 id="request-heading" className="font-display text-headline">
          Request a quote
        </h2>
        <Suspense fallback={<p className="mt-8 text-muted">Loading…</p>}>
          <RequestArea offer={offer} />
        </Suspense>
      </section>
    </Container>
  );
}

async function RequestArea({ offer }: { offer: keyof typeof OFFERS }) {
  const user = await getCurrentUser();
  if (!user) {
    const next = encodeURIComponent(`/services/${offer}`);
    return (
      <div className="mt-8">
        <p className="max-w-lg text-lg text-muted">
          Create a free account or sign in to send a request. You&apos;ll follow
          its status and talk to our team in one place.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href={`/signup?next=${next}`}>Create account</ButtonLink>
          <ButtonLink href={`/login?next=${next}`} variant="secondary">
            Sign in
          </ButtonLink>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-10">
      <ServiceRequestForm
        types={OFFERS[offer].types}
        countries={COUNTRIES}
        action={createServiceRequest.bind(null, offer)}
      />
    </div>
  );
}
