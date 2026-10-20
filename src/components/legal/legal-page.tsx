import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";

/**
 * Set to false once a lawyer has reviewed the texts and the placeholders in
 * [BRACKETS] are filled in (company name, address, register, VAT ID…).
 */
export const LEGAL_DRAFT = true;

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <Container className="py-16 sm:py-24">
      <Meta>Legal</Meta>
      <h1 className="mt-4 font-display text-headline">{title}</h1>
      <p className="mt-3 text-sm text-muted">Last updated: {updated}</p>
      {LEGAL_DRAFT ? (
        <p
          role="note"
          className="mt-8 max-w-prose rounded-(--radius) border border-uv/50 p-4 text-sm"
        >
          <strong className="font-medium">Draft.</strong> This text is being
          finalised and reviewed and may change before launch.
        </p>
      ) : null}
      <div className="mt-10 flex max-w-prose flex-col gap-5 leading-relaxed text-muted [&_a]:text-text [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-3xl [&_h2]:text-text [&_strong]:text-text [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </Container>
  );
}
