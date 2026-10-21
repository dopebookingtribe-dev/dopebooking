import Link from "next/link";
import { DemoBadge } from "@/components/ui/demo-badge";
import { Picture } from "@/components/ui/picture";
import { formatEventRange } from "@/lib/datetime";
import type { EventCard } from "../queries";
import { eventPlace } from "./event-row";

/** Day and month stamp, read in the event's own time zone. */
function dateStamp(iso: string, timeZone: string) {
  const date = new Date(iso);
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { timeZone, ...options }).format(date);
  return { day: part({ day: "numeric" }), month: part({ month: "short" }) };
}

/** Wide cinematic card for the lead event in a showcase. */
export function EventFeature({
  event,
  priority = false,
  showDemo = true,
  compact = false,
}: {
  event: EventCard;
  priority?: boolean;
  showDemo?: boolean;
  compact?: boolean;
}) {
  const stamp = dateStamp(event.startsAt, event.timezone);
  const place = eventPlace(event);
  return (
    <Link
      href={`/events/${event.slug}`}
      className="group relative block overflow-hidden rounded-(--radius) bg-surface-2"
    >
      <div
        className={`relative ${compact ? "aspect-[4/3]" : "aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/9]"}`}
      >
        {event.cover ? (
          <Picture
            image={event.cover}
            decorative
            priority={priority}
            sizes={compact ? "(min-width: 1024px) 40vw, 92vw" : "100vw"}
            className="transition-transform duration-1000 ease-(--ease-out) group-hover:scale-[1.03]"
          />
        ) : null}
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-t from-bg via-bg/40 to-bg/0"
        />
      </div>
      {event.isDemo && showDemo ? (
        <DemoBadge className="absolute top-4 right-4" />
      ) : null}
      <div className="absolute inset-x-0 bottom-0 flex items-end gap-5 p-5 sm:gap-8 sm:p-8">
        <p
          aria-hidden
          className="shrink-0 border-l-2 border-accent pl-4 font-label leading-none"
        >
          <span className="block text-5xl sm:text-6xl">{stamp.day}</span>
          <span className="mt-1 block text-lg text-accent">{stamp.month}</span>
        </p>
        <div className="min-w-0">
          <h3
            className={`font-display leading-none ${compact ? "text-2xl sm:text-3xl" : "text-[clamp(1.8rem,1rem+3vw,4rem)]"}`}
          >
            {event.title}
          </h3>
          <p className="mt-3 text-sm text-text/80">
            {formatEventRange(event.startsAt, event.endsAt, event.timezone)}
            {place ? `, ${place}` : ""}
          </p>
        </div>
      </div>
    </Link>
  );
}
