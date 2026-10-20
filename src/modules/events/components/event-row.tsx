import Image from "next/image";
import Link from "next/link";
import { countryName } from "@/lib/countries";
import { formatEventRange } from "@/lib/datetime";
import type { EventCard } from "../queries";

export function eventPlace(
  event: Pick<EventCard, "venueName" | "city" | "country">,
) {
  return [event.venueName, event.city, countryName(event.country)]
    .filter(Boolean)
    .join(", ");
}

/** Editorial list row: date, title, place, with a cover thumbnail. */
export function EventRow({ event }: { event: EventCard }) {
  const place = eventPlace(event);
  return (
    <Link
      href={`/events/${event.slug}`}
      className="group grid items-center gap-4 border-b border-line py-6 sm:grid-cols-[11rem_1fr_9rem] sm:gap-8"
    >
      <p className="font-label text-xs text-muted">
        {formatEventRange(event.startsAt, event.endsAt, event.timezone)}
      </p>
      <div>
        <h3 className="font-display text-3xl transition-colors group-hover:text-accent sm:text-4xl">
          {event.title}
        </h3>
        {place ? <p className="mt-1 text-sm text-muted">{place}</p> : null}
      </div>
      <div className="relative hidden aspect-[3/2] overflow-hidden rounded-(--radius) bg-surface-2 sm:block">
        {event.cover ? (
          <Image
            src={event.cover.url}
            alt=""
            fill
            sizes="9rem"
            className="object-cover transition-transform duration-700 ease-(--ease-out) group-hover:scale-105"
          />
        ) : null}
      </div>
    </Link>
  );
}
