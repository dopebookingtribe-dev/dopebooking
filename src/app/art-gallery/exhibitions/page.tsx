import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { ArtExhibitionIndex } from "@/modules/art/components/art-sections";
import { PageSections } from "@/modules/cms/components/page-sections";
import { pageMetadata } from "@/modules/cms/metadata";
import { getPublishedPage } from "@/modules/cms/queries";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("art-exhibitions");
}

async function Index({
  searchParams,
}: {
  searchParams: PageProps<"/art-gallery/exhibitions">["searchParams"];
}) {
  const { view } = await searchParams;
  return (
    <ArtExhibitionIndex view={typeof view === "string" ? view : undefined} />
  );
}

export default async function ArtExhibitionsPage({
  searchParams,
}: PageProps<"/art-gallery/exhibitions">) {
  const content = await getPublishedPage("art-exhibitions");
  return (
    <PageSections
      content={content}
      title="Exhibitions"
      builtins={{
        "art-exhibition-index": (
          <Suspense
            fallback={
              <Container className="py-20">
                <div
                  aria-hidden
                  className="aspect-[16/9] animate-pulse rounded-(--radius) bg-surface-1"
                />
              </Container>
            }
          >
            <Index searchParams={searchParams} />
          </Suspense>
        ),
      }}
    />
  );
}
