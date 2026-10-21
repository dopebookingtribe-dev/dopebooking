import type { Metadata } from "next";
import { PageSections } from "@/modules/cms/components/page-sections";
import { pageMetadata } from "@/modules/cms/metadata";
import { getPublishedPage } from "@/modules/cms/queries";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("home");
}

export default async function HomePage() {
  const content = await getPublishedPage("home");
  return <PageSections content={content} title="DopeBooking" />;
}
