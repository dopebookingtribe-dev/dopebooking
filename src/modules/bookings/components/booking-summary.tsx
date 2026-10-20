import type { BookingRequestRow } from "@/lib/supabase/database.types";
import { countryName } from "@/lib/countries";
import { Meta } from "@/components/ui/meta";

export function formatMoney(amount: number | null, currency: string | null) {
  if (amount === null) return null;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency ?? "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDay(isoDate: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

/** Read-only facts of a request. `showPrivate` adds contact details (staff). */
export function BookingSummary({
  booking,
  showPrivate = false,
}: {
  booking: BookingRequestRow;
  showPrivate?: boolean;
}) {
  const rows: [string, string | null][] = [
    ["Event", booking.event_name],
    ["Organiser", booking.organisation],
    ["Date", formatDay(booking.event_date)],
    [
      "Place",
      [booking.venue_name, booking.city, countryName(booking.country)]
        .filter(Boolean)
        .join(", "),
    ],
    ["Guests", booking.expected_attendance?.toLocaleString("en-GB") ?? null],
    [
      "Set length",
      booking.set_length_minutes
        ? `${booking.set_length_minutes / 60} h`
        : null,
    ],
    ["Budget", formatMoney(booking.budget_amount, booking.budget_currency)],
    ...(showPrivate
      ? ([
          ["Email", booking.contact_email],
          ["Phone", booking.contact_phone],
        ] as [string, string | null][])
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      {booking.quote_amount !== null ? (
        <div className="rounded-(--radius) border border-accent/50 p-5">
          <Meta>Our quote</Meta>
          <p className="mt-2 font-display text-5xl text-accent">
            {formatMoney(booking.quote_amount, booking.quote_currency)}
          </p>
          {booking.quote_note ? (
            <p className="mt-3 text-sm whitespace-pre-line text-muted">
              {booking.quote_note}
            </p>
          ) : null}
        </div>
      ) : null}
      <dl className="divide-y divide-line border-y border-line">
        {rows
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div
              key={label}
              className="grid grid-cols-[7rem_1fr] gap-4 py-3 text-sm"
            >
              <dt className="text-muted">{label}</dt>
              <dd className="break-words">{value}</dd>
            </div>
          ))}
      </dl>
      {booking.message ? (
        <div>
          <Meta>Message</Meta>
          <p className="mt-2 text-sm whitespace-pre-line">{booking.message}</p>
        </div>
      ) : null}
    </div>
  );
}
