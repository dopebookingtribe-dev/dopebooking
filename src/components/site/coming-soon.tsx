import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";

/** Temporary page body for sections that ship in later phases. */
export function ComingSoon({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <Container className="py-24 sm:py-32">
      <Meta>{eyebrow}</Meta>
      <h1 className="mt-4 max-w-3xl font-display text-headline">{title}</h1>
      <p className="mt-6 max-w-xl text-muted">{body}</p>
      <ButtonLink href="/" variant="secondary" className="mt-10">
        Back to home
      </ButtonLink>
    </Container>
  );
}
