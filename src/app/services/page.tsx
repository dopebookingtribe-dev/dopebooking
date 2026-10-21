import type { Metadata } from "next";
import { PageSections } from "@/modules/cms/components/page-sections";
import { pageMetadata } from "@/modules/cms/metadata";
import { getPublishedPage } from "@/modules/cms/queries";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("services");
}

export default async function ServicesPage() {
  const content = await getPublishedPage("services");
  return <PageSections content={content} title="Festival services" />;
}
