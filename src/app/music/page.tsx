import type { Metadata } from "next";
import { Suspense } from "react";
import { GridSkeleton } from "@/modules/artists/components/artist-directory";
import { PageSections } from "@/modules/cms/components/page-sections";
import { pageMetadata } from "@/modules/cms/metadata";
import { getPublishedPage } from "@/modules/cms/queries";
import { MusicStore } from "@/modules/music/components/music-store";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("music");
}

export default async function MusicPage({ searchParams }: PageProps<"/music">) {
  const content = await getPublishedPage("music");
  return (
    <PageSections
      content={content}
      title="Music"
      builtins={{
        "music-store": (
          <Suspense fallback={<GridSkeleton count={4} />}>
            <MusicStore searchParams={searchParams} />
          </Suspense>
        ),
      }}
    />
  );
}
