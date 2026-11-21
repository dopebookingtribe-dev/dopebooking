import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { ArtArtistIndex } from "@/modules/art/components/art-sections";
import { PageSections } from "@/modules/cms/components/page-sections";
import { pageMetadata } from "@/modules/cms/metadata";
import { getPublishedPage } from "@/modules/cms/queries";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("art-artists");
}

async function Index({
  searchParams,
}: {
  searchParams: PageProps<"/art-gallery/artists">["searchParams"];
}) {
  const { d } = await searchParams;
  return <ArtArtistIndex discipline={typeof d === "string" ? d : undefined} />;
}

function Skeleton() {
  return (
    <Container
      aria-hidden
      className="grid grid-cols-2 gap-6 py-20 sm:grid-cols-3 lg:grid-cols-4"
    >
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className="aspect-[3/4] animate-pulse rounded-t-full rounded-b-lg bg-surface-1"
        />
      ))}
    </Container>
  );
}

export default async function ArtArtistsPage({
  searchParams,
}: PageProps<"/art-gallery/artists">) {
  const content = await getPublishedPage("art-artists");
  return (
    <PageSections
      content={content}
      title="Artists"
      builtins={{
        "art-artist-index": (
          <Suspense fallback={<Skeleton />}>
            <Index searchParams={searchParams} />
          </Suspense>
        ),
      }}
    />
  );
}
