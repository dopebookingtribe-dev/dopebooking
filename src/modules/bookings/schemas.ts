import { z } from "zod";
import type { BookingStatus } from "@/lib/supabase/database.types";
import { countrySchema, optionalText, requiredText } from "@/lib/validation";

export const STATUS_LABELS: Record<BookingStatus, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  quoted: "Quote sent",
  negotiating: "Negotiating",
  confirmed: "Confirmed",
  completed: "Completed",
  declined: "Declined",
  cancelled: "Cancelled",
  expired: "Expired",
};

export const OPEN_STATUSES: BookingStatus[] = [
  "submitted",
  "under_review",
  "quoted",
  "negotiating",
];

/**
 * Mirror of the staff workflow in public.transition_booking(); the database
 * is the authority, this only decides which buttons to show.
 */
export const STAFF_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  submitted: ["under_review", "declined"],
  under_review: ["quoted", "declined"],
  quoted: ["quoted", "negotiating", "confirmed", "declined", "expired"],
  negotiating: ["quoted", "confirmed", "declined"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  declined: [],
  cancelled: [],
  expired: [],
};

export const TRANSITION_LABELS: Partial<Record<BookingStatus, string>> = {
  under_review: "Start review",
  quoted: "Send quote",
  negotiating: "Mark negotiating",
  confirmed: "Confirm booking",
  completed: "Mark completed",
  declined: "Decline",
  cancelled: "Cancel booking",
  expired: "Mark expired",
};

export const SET_LENGTHS = [60, 90, 120, 150, 180, 240] as const;
export const CURRENCIES = [
  "EUR",
  "USD",
  "GBP",
  "CHF",
  "BRL",
  "ILS",
  "INR",
  "AUD",
];

const optionalInt = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : Number(value)))
    .refine(
      (value) =>
        value === null ||
        (Number.isInteger(value) && value >= min && value <= max),
      { message },
    );

const currency = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Use a 3-letter currency code, e.g. EUR.");

/** "YYYY-MM-DD" in UTC, used to reject past dates. */
export function todayIso(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export const bookingRequestSchema = z.object({
  event_name: requiredText("event name", 160),
  organisation: optionalText(160),
  event_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the event date.")
    .refine((value) => value >= todayIso(), {
      message: "The date must be today or later.",
    }),
  city: requiredText("city", 80),
  country: countrySchema.refine((value) => value !== null, {
    message: "Choose a country.",
  }),
  venue_name: optionalText(160),
  expected_attendance: optionalInt(1, 1_000_000, "Use a whole number."),
  set_length_minutes: optionalInt(15, 600, "Choose a set length."),
  budget_amount: optionalInt(0, 100_000_000, "Use a whole amount."),
  budget_currency: currency,
  message: optionalText(4000),
  contact_phone: z
    .string()
    .trim()
    .max(32)
    .refine((value) => value === "" || /^\+?[0-9 ()-]{6,}$/.test(value), {
      message: "Use digits, spaces and an optional leading +.",
    })
    .transform((value) => (value === "" ? null : value)),
});

export const messageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write a message first.")
    .max(4000, "Keep it under 4000 characters."),
  internal: z
    .union([z.literal("on"), z.literal("")])
    .optional()
    .transform((value) => value === "on"),
});

export const transitionSchema = z
  .object({
    to: z.enum(Object.keys(STATUS_LABELS) as [BookingStatus]),
    note: optionalText(2000),
    quote_amount: optionalInt(0, 100_000_000, "Use a whole amount."),
    quote_currency: currency.optional(),
    quote_note: optionalText(2000),
  })
  .refine((data) => data.to !== "quoted" || data.quote_amount !== null, {
    message: "Enter the quote amount.",
    path: ["quote_amount"],
  });

/** Friendly text for errors raised by the booking database functions. */
export function bookingErrorMessage(error: {
  message?: string;
  code?: string;
}) {
  const text = error.message ?? "";
  if (text.includes("rate_limited")) {
    return "You've sent a lot in the last hour. Please try again later.";
  }
  if (text.includes("invalid_transition")) {
    return "That step isn't possible from the current status. Refresh the page.";
  }
  if (text.includes("quote_required")) return "Enter the quote amount.";
  if (error.code === "42501" || text.includes("forbidden")) {
    return "You can't do that for this booking.";
  }
  return "Something went wrong. Please try again.";
}
