import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageSections } from "@/modules/cms/components/page-sections";
import { pageMetadata } from "@/modules/cms/metadata";
import { getPublishedPage } from "@/modules/cms/queries";
import {
  RequestArea,
  RequestShell,
} from "@/modules/services/components/request-area";
import { isOffer, OFFERS } from "@/modules/services/schemas";

type Props = PageProps<"/services/[offer]">;

export function generateStaticParams() {
  return Object.keys(OFFERS).map((offer) => ({ offer }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { offer } = await params;
  if (!isOffer(offer)) return { title: "Not found" };
  return pageMetadata(offer);
}

export default function OfferPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="min-h-[70svh]" />}>
      <Offer params={params} />
    </Suspense>
  );
}

async function Offer({ params }: { params: Props["params"] }) {
  const { offer } = await params;
  if (!isOffer(offer)) notFound();
  const content = await getPublishedPage(offer);

  return (
    <PageSections
      content={content}
      title={OFFERS[offer].title}
      builtins={{
        "request-form": (
          <RequestShell>
            <Suspense fallback={<p className="mt-8 text-muted">Loading…</p>}>
              <RequestArea offer={offer} />
            </Suspense>
          </RequestShell>
        ),
      }}
    />
  );
}
