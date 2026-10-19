// Event times are entered and shown in the event's own time zone,
// and stored in UTC. No date library needed: Intl does the zone math.

const LOCAL_INPUT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Offset of `timeZone` from UTC at instant `utcMs`, in milliseconds. */
function zoneOffset(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/**
 * "2026-08-14T22:00" in "Europe/Lisbon" -> UTC ISO string.
 * Returns null for malformed input. Non-existent local times (DST gaps)
 * resolve forward, like most calendars do.
 */
export function zonedInputToUtc(
  local: string,
  timeZone: string,
): string | null {
  const match = local.match(LOCAL_INPUT);
  if (!match || !isTimeZone(timeZone)) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  const wallClock = Date.UTC(y, mo - 1, d, h, mi);
  if (new Date(wallClock).getUTCDate() !== d) return null; // e.g. Feb 30

  let utc = wallClock - zoneOffset(wallClock, timeZone);
  // Re-check once: the offset can differ on the other side of a DST change.
  utc = wallClock - zoneOffset(utc, timeZone);
  return new Date(utc).toISOString();
}

/** UTC ISO -> "YYYY-MM-DDTHH:mm" in `timeZone`, for datetime-local inputs. */
export function utcToZonedInput(iso: string | null, timeZone: string): string {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** "Fri 14 Aug 2026" in the event's zone. */
export function formatEventDate(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

/** "22:00" in the event's zone. */
export function formatEventTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

/** "14–17 Aug 2026", "30 Jul – 2 Aug 2026" or a single date. */
export function formatEventRange(
  startIso: string,
  endIso: string | null,
  timeZone: string,
) {
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : null;
  const format = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  if (!end) return format.format(start);
  const sameDay =
    utcToZonedInput(startIso, timeZone).slice(0, 10) ===
    utcToZonedInput(endIso, timeZone).slice(0, 10);
  return sameDay ? format.format(start) : format.formatRange(start, end);
}

/** Common zones first; the full list is long. */
export const COMMON_TIME_ZONES = [
  "Europe/Berlin",
  "Europe/Lisbon",
  "Europe/London",
  "Europe/Amsterdam",
  "Europe/Budapest",
  "Europe/Athens",
  "Europe/Istanbul",
  "Asia/Jerusalem",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Australia/Sydney",
  "America/Sao_Paulo",
  "America/Mexico_City",
  "America/New_York",
  "America/Los_Angeles",
  "Africa/Johannesburg",
  "UTC",
];

export function allTimeZones(): string[] {
  const supported =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : [];
  return [
    ...COMMON_TIME_ZONES,
    ...supported.filter((zone) => !COMMON_TIME_ZONES.includes(zone)),
  ];
}
