import { Container } from "@/components/ui/container";
import { getSiteSettings } from "@/modules/cms/queries";
import { getPublishedEvents } from "../queries";
import { EventFeature } from "./event-feature";
import { EventRow } from "./event-row";

export async function EventList() {
  const [{ upcoming, past }, settings] = await Promise.all([
    getPublishedEvents(),
    getSiteSettings(),
  ]);
  if (!upcoming.length && !past.length) {
    return (
      <Container className="py-16">
        <p className="text-lg text-muted">New dates are announced soon.</p>
      </Container>
    );
  }
  const [lead, ...rest] = upcoming;
  return (
    <Container className="py-12 sm:py-16">
      <section aria-labelledby="upcoming-heading">
        <h2 id="upcoming-heading" className="font-display text-headline">
          Upcoming
        </h2>
        {lead ? (
          <div className="mt-10">
            <EventFeature
              event={lead}
              priority
              showDemo={settings.showDemoLabels}
            />
            {rest.length ? (
              <ul className="mt-4 grid gap-4 sm:mt-6 sm:grid-cols-2 sm:gap-6">
                {rest.map((event) => (
                  <li key={event.id}>
                    <EventFeature
                      event={event}
                      compact
                      showDemo={settings.showDemoLabels}
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <p className="mt-6 text-muted">New dates are announced soon.</p>
        )}
      </section>
      {past.length ? (
        <section aria-labelledby="past-heading" className="mt-24">
          <h2 id="past-heading" className="font-display text-headline">
            Past
          </h2>
          <ul className="mt-8 border-t border-line">
            {past.map((event) => (
              <li key={event.id}>
                <EventRow event={event} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Container>
  );
}
