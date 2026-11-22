import type { ReactNode } from "react";
import { LegalPage } from "@/components/legal/legal-page";
import { parseBody } from "@/modules/posts/body";
import { PostBody } from "@/modules/posts/components/post-body";
import type { LegalDoc } from "../docs";
import { getPublishedLegal } from "../queries";

/**
 * Shows the version published in Admin → Legal pages, or the original page
 * (`children`) when none is published.
 */
export async function CmsLegal({
  doc,
  children,
}: {
  doc: LegalDoc;
  children: ReactNode;
}) {
  const content = await getPublishedLegal(doc);
  if (!content) return children;
  return (
    <LegalPage
      title={content.title}
      updated={content.updated}
      draft={content.showDraftNotice}
    >
      <PostBody blocks={parseBody(content.body)} embeds={{}} size="base" />
    </LegalPage>
  );
}
