import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSections } from "@/modules/cms/components/page-sections";
import { pageMetadata } from "@/modules/cms/metadata";
import { getPublishedPage } from "@/modules/cms/queries";
import { GridSkeleton } from "@/modules/artists/components/artist-directory";
import { GalleryIndex } from "@/modules/galleries/components/gallery-index";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("gallery");
}

export default async function GalleryIndexPage() {
  const content = await getPublishedPage("gallery");
  return (
    <PageSections
      content={content}
      title="Photos"
      builtins={{
        "gallery-index": (
          <Suspense fallback={<GridSkeleton count={2} />}>
            <GalleryIndex />
          </Suspense>
        ),
      }}
    />
  );
}
