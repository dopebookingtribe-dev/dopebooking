import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSections } from "@/modules/cms/components/page-sections";
import { pageMetadata } from "@/modules/cms/metadata";
import { getPublishedPage } from "@/modules/cms/queries";
import { GridSkeleton } from "@/modules/artists/components/artist-directory";
import { VideoIndex } from "@/modules/videos/components/video-index";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("videos");
}

export default async function VideosPage() {
  const content = await getPublishedPage("videos");
  return (
    <PageSections
      content={content}
      title="Videos"
      builtins={{
        "video-index": (
          <Suspense fallback={<GridSkeleton count={2} />}>
            <VideoIndex />
          </Suspense>
        ),
      }}
    />
  );
}
