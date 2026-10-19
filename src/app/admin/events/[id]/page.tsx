import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  AdminHeader,
  EditSection,
  StatusBadge,
} from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { COUNTRIES } from "@/lib/countries";
import { allTimeZones } from "@/lib/datetime";
import {
  deleteEventImage,
  registerEventImage,
  saveLineup,
  setEventCover,
  updateEventDetails,
} from "@/modules/events/actions";
import { getEventForAdmin } from "@/modules/events/admin-queries";
import { EventDetailsForm } from "@/modules/events/components/admin/event-details-form";
import { LineupForm } from "@/modules/events/components/admin/lineup-form";
import { ImageGrid } from "@/modules/media/components/image-grid";
import { ImageUploader } from "@/modules/media/components/image-uploader";
import { mediaFolder } from "@/modules/media/server";

export const metadata: Metadata = { title: "Edit event" };

export default function EditEventPage({
  params,
}: PageProps<"/admin/events/[id]">) {
  return (
    <Container className="py-12">
      <Suspense fallback={<p className="text-muted">Loading event…</p>}>
        <Editor params={params} />
      </Suspense>
    </Container>
  );
}

async function Editor({
  params,
}: {
  params: PageProps<"/admin/events/[id]">["params"];
}) {
  const { id } = await params;
  const data = await getEventForAdmin(id);
  if (!data) notFound();
  const { event, lineup, images, artistOptions } = data;

  return (
    <>
      <AdminHeader
        title={event.title}
        eyebrow="Edit event"
        backHref="/admin/events"
        backLabel="All events"
      >
        <StatusBadge status={event.status} />
        {event.status === "published" ? (
          <Link
            href={`/events/${event.slug}`}
            className="text-sm underline underline-offset-4"
          >
            View public page
          </Link>
        ) : null}
      </AdminHeader>
      <div className="mt-12 flex flex-col gap-16">
        <EditSection
          title="Details"
          description="Public once the event is published."
        >
          <EventDetailsForm
            event={event}
            action={updateEventDetails.bind(null, event.id)}
            countries={COUNTRIES}
            timeZones={allTimeZones()}
          />
        </EditSection>
        <EditSection
          title="Lineup"
          description="Order is the running order shown on the page."
        >
          <LineupForm
            lineup={lineup}
            artistOptions={artistOptions}
            timezone={event.timezone}
            action={saveLineup.bind(null, event.id)}
          />
        </EditSection>
        <EditSection
          title="Cover image"
          description="Wide (16:9 or 3:2) photos work best. The first upload becomes the cover."
        >
          <div className="flex flex-col gap-8">
            <ImageGrid
              images={images}
              leadId={event.cover_asset_id}
              leadLabel="Cover"
              makeLead={setEventCover.bind(null, event.id)}
              remove={deleteEventImage.bind(null, event.id)}
            />
            <ImageUploader
              folder={mediaFolder("event", event.id)}
              register={registerEventImage.bind(null, event.id)}
            />
          </div>
        </EditSection>
      </div>
    </>
  );
}
