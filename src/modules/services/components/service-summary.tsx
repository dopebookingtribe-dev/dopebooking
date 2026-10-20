import { Meta } from "@/components/ui/meta";
import { countryName } from "@/lib/countries";
import type { ServiceRequestRow } from "@/lib/supabase/database.types";
import { formatDay, formatMoney } from "@/modules/workflow/constants";
import { describeDetails, SERVICE_LABELS } from "../schemas";

/** Read-only facts of a service request. `showPrivate` adds contact (staff). */
export function ServiceSummary({
  request,
  showPrivate = false,
}: {
  request: ServiceRequestRow;
  showPrivate?: boolean;
}) {
  const dates =
    request.event_end && request.event_end !== request.event_start
      ? `${formatDay(request.event_start)} – ${formatDay(request.event_end)}`
      : formatDay(request.event_start);
  const rows: [string, string | null][] = [
    ["Service", SERVICE_LABELS[request.service_type]],
    ["Event", request.event_name],
    ["Organiser", request.organisation],
    ["Dates", dates],
    [
      "Place",
      [request.venue_name, request.city, countryName(request.country)]
        .filter(Boolean)
        .join(", "),
    ],
    ["Guests", request.expected_attendance?.toLocaleString("en-GB") ?? null],
    ["Budget", formatMoney(request.budget_amount, request.budget_currency)],
    ...describeDetails(request.service_type, request.details),
    ...(showPrivate
      ? ([
          ["Email", request.contact_email],
          ["Phone", request.contact_phone],
        ] as [string, string | null][])
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      {request.quote_amount !== null ? (
        <div className="rounded-(--radius) border border-accent/50 p-5">
          <Meta>Our quote</Meta>
          <p className="mt-2 font-display text-5xl text-accent">
            {formatMoney(request.quote_amount, request.quote_currency)}
          </p>
          {request.quote_note ? (
            <p className="mt-3 text-sm whitespace-pre-line text-muted">
              {request.quote_note}
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
              className="grid grid-cols-[9rem_1fr] gap-4 py-3 text-sm"
            >
              <dt className="text-muted">{label}</dt>
              <dd className="break-words">{value}</dd>
            </div>
          ))}
      </dl>
      {request.message ? (
        <div>
          <Meta>Message</Meta>
          <p className="mt-2 text-sm whitespace-pre-line">{request.message}</p>
        </div>
      ) : null}
    </div>
  );
}
