import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSections } from "@/modules/cms/components/page-sections";
import { pageMetadata } from "@/modules/cms/metadata";
import { getPublishedPage } from "@/modules/cms/queries";
import { GridSkeleton } from "@/modules/artists/components/artist-directory";
import { EventList } from "@/modules/events/components/event-list";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("events");
}

export default async function EventsPage() {
  const content = await getPublishedPage("events");
  return (
    <PageSections
      content={content}
      title="Events"
      builtins={{
        "event-list": (
          <Suspense fallback={<GridSkeleton count={2} />}>
            <EventList />
          </Suspense>
        ),
      }}
    />
  );
}
