import type { Metadata } from "next";
import { PageSections } from "@/modules/cms/components/page-sections";
import { pageMetadata } from "@/modules/cms/metadata";
import { getPublishedPage } from "@/modules/cms/queries";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("about");
}

export default async function AboutPage() {
  const content = await getPublishedPage("about");
  return <PageSections content={content} title="About DopeBooking" />;
}
