import type { Metadata } from "next";
import { Suspense } from "react";
import { ArtInquiryArea } from "@/modules/art/components/art-sections";
import { PageSections } from "@/modules/cms/components/page-sections";
import { pageMetadata } from "@/modules/cms/metadata";
import { getPublishedPage } from "@/modules/cms/queries";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("art-collaborate");
}

async function Inquiry({
  searchParams,
}: {
  searchParams: PageProps<"/art-gallery/collaborate">["searchParams"];
}) {
  const { artist } = await searchParams;
  return (
    <ArtInquiryArea artist={typeof artist === "string" ? artist : undefined} />
  );
}

export default async function ArtCollaboratePage({
  searchParams,
}: PageProps<"/art-gallery/collaborate">) {
  const content = await getPublishedPage("art-collaborate");
  return (
    <PageSections
      content={content}
      title="Collaborate with us"
      builtins={{
        "art-inquiry-form": (
          <Suspense fallback={<div className="min-h-[40rem]" />}>
            <Inquiry searchParams={searchParams} />
          </Suspense>
        ),
      }}
    />
  );
}
