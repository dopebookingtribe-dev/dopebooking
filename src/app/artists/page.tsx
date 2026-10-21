import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSections } from "@/modules/cms/components/page-sections";
import { pageMetadata } from "@/modules/cms/metadata";
import { getPublishedPage } from "@/modules/cms/queries";
import {
  ArtistDirectory,
  GridSkeleton,
} from "@/modules/artists/components/artist-directory";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("artists");
}

export default async function ArtistsPage({
  searchParams,
}: PageProps<"/artists">) {
  const content = await getPublishedPage("artists");
  return (
    <PageSections
      content={content}
      title="Artists"
      builtins={{
        "artist-directory": (
          <Suspense fallback={<GridSkeleton />}>
            <ArtistDirectory searchParams={searchParams} />
          </Suspense>
        ),
      }}
    />
  );
}
