import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSections } from "@/modules/cms/components/page-sections";
import { pageMetadata } from "@/modules/cms/metadata";
import { getPublishedPage } from "@/modules/cms/queries";
import {
  SellApply,
  SellApplyArea,
} from "@/modules/marketplace/components/sell-apply";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("sell");
}

export default async function SellPage() {
  const content = await getPublishedPage("sell");
  return (
    <PageSections
      content={content}
      title="Sell with us"
      builtins={{
        "sell-application": (
          <SellApply>
            <Suspense fallback={<p className="mt-8 text-muted">Loading…</p>}>
              <SellApplyArea />
            </Suspense>
          </SellApply>
        ),
      }}
    />
  );
}
