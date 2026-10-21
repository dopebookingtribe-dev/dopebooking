import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { getCurrentUser } from "@/lib/auth/dal";
import { COUNTRIES } from "@/lib/countries";
import { createServiceRequest } from "../actions";
import { OFFERS, type Offer } from "../schemas";
import { ServiceRequestForm } from "./service-request-form";

export function RequestShell({ children }: { children: React.ReactNode }) {
  return (
    <Container className="py-16 sm:py-24">
      <div className="max-w-3xl rounded-(--radius) border border-line bg-surface-1 p-6 sm:p-10">
        <h2 className="font-display text-headline">Request a quote</h2>
        {children}
      </div>
    </Container>
  );
}

export async function RequestArea({ offer }: { offer: Offer }) {
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
