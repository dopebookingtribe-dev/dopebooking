import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSections } from "@/modules/cms/components/page-sections";
import { pageMetadata } from "@/modules/cms/metadata";
import { getPublishedPage } from "@/modules/cms/queries";
import { GridSkeleton } from "@/modules/artists/components/artist-directory";
import { ShopCatalog } from "@/modules/marketplace/components/shop-catalog";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("shop");
}

export default async function ShopPage({ searchParams }: PageProps<"/shop">) {
  const content = await getPublishedPage("shop");
  return (
    <PageSections
      content={content}
      title="Shop"
      builtins={{
        "shop-catalog": (
          <Suspense fallback={<GridSkeleton count={4} />}>
            <ShopCatalog searchParams={searchParams} />
          </Suspense>
        ),
      }}
    />
  );
}
