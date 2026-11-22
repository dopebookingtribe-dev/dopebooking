import type { Metadata } from "next";
import { Suspense } from "react";
import { GridSkeleton } from "@/modules/artists/components/artist-directory";
import { PageSections } from "@/modules/cms/components/page-sections";
import { pageMetadata } from "@/modules/cms/metadata";
import { getPublishedPage } from "@/modules/cms/queries";
import { PostIndex } from "@/modules/posts/components/post-index";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("news");
}

export default async function NewsPage({ searchParams }: PageProps<"/news">) {
  const content = await getPublishedPage("news");
  return (
    <PageSections
      content={content}
      title="News"
      builtins={{
        "post-index": (
          <Suspense fallback={<GridSkeleton count={3} />}>
            <Index searchParams={searchParams} />
          </Suspense>
        ),
      }}
    />
  );
}

async function Index({
  searchParams,
}: {
  searchParams: PageProps<"/news">["searchParams"];
}) {
  const { category } = await searchParams;
  return (
    <PostIndex category={typeof category === "string" ? category : undefined} />
  );
}
