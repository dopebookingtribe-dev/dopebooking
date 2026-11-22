import type { AvailabilityStatus } from "@/lib/supabase/database.types";

export const AVAILABILITY_STATUSES: Record<AvailabilityStatus, string> = {
  available: "Available for bookings",
  touring: "On tour",
  booked: "Booked",
  unavailable: "Not available",
};

/** "2–20 Mar 2027", "28 Mar – 3 Apr 2027", "5 Jun 2027". */
export function formatDateRange(startsOn: string, endsOn: string) {
  const parse = (value: string) => new Date(`${value}T12:00:00Z`);
  const start = parse(startsOn);
  const end = parse(endsOn);
  const day = (d: Date) => d.getUTCDate();
  const month = (d: Date) =>
    d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" });
  const year = (d: Date) => d.getUTCFullYear();
  if (startsOn === endsOn)
    return `${day(start)} ${month(start)} ${year(start)}`;
  if (year(start) !== year(end)) {
    return `${day(start)} ${month(start)} ${year(start)} – ${day(end)} ${month(end)} ${year(end)}`;
  }
  if (month(start) !== month(end)) {
    return `${day(start)} ${month(start)} – ${day(end)} ${month(end)} ${year(end)}`;
  }
  return `${day(start)}–${day(end)} ${month(end)} ${year(end)}`;
}
