import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { EventRow } from "@/modules/events/components/event-row";
import { getPublishedEvents } from "@/modules/events/queries";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Upcoming and past festivals and nights with DopeBooking artists.",
  alternates: { canonical: "/events" },
};

export default function EventsPage() {
  return (
    <Container className="py-16 sm:py-24">
      <h1 className="font-display text-display">Events</h1>
      <Suspense fallback={<p className="mt-16 text-muted">Loading events…</p>}>
        <EventLists />
      </Suspense>
    </Container>
  );
}

async function EventLists() {
  const { upcoming, past } = await getPublishedEvents();
  if (!upcoming.length && !past.length) {
    return <p className="mt-16 text-muted">New dates are announced soon.</p>;
  }
  return (
    <>
      <section aria-labelledby="upcoming-heading" className="mt-16">
        <h2 id="upcoming-heading">
          <Meta>Upcoming</Meta>
        </h2>
        {upcoming.length ? (
          <ul className="mt-4 border-t border-line">
            {upcoming.map((event) => (
              <li key={event.id}>
                <EventRow event={event} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-muted">New dates are announced soon.</p>
        )}
      </section>
      {past.length ? (
        <section aria-labelledby="past-heading" className="mt-20">
          <h2 id="past-heading">
            <Meta>Past</Meta>
          </h2>
          <ul className="mt-4 border-t border-line opacity-80">
            {past.map((event) => (
              <li key={event.id}>
                <EventRow event={event} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
