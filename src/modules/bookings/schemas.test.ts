import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  bookingErrorMessage,
  bookingRequestSchema,
  messageSchema,
  STAFF_TRANSITIONS,
  todayIso,
  transitionSchema,
} from "./schemas";

const valid = {
  event_name: "Forest Gathering",
  organisation: "",
  event_date: "2099-08-14",
  city: "Berlin",
  country: "de",
  venue_name: "",
  expected_attendance: "1200",
  set_length_minutes: "120",
  budget_amount: "",
  budget_currency: "eur",
  message: "",
  contact_phone: "+49 30 1234567",
};

describe("bookingRequestSchema", () => {
  it("normalises a valid request", () => {
    expect(bookingRequestSchema.parse(valid)).toMatchObject({
      country: "DE",
      expected_attendance: 1200,
      set_length_minutes: 120,
      budget_amount: null,
      budget_currency: "EUR",
      organisation: null,
    });
  });

  it("rejects past dates, missing country and odd phone numbers", () => {
    const result = bookingRequestSchema.safeParse({
      ...valid,
      event_date: "2001-01-01",
      country: "",
      contact_phone: "call me",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path[0]).sort();
      expect(paths).toEqual(["contact_phone", "country", "event_date"]);
    }
  });

  it("accepts today", () => {
    expect(
      bookingRequestSchema.safeParse({ ...valid, event_date: todayIso() })
        .success,
    ).toBe(true);
  });
});

describe("transitionSchema", () => {
  it("requires an amount for quotes", () => {
    expect(
      transitionSchema.safeParse({ to: "quoted", note: "", quote_amount: "" })
        .success,
    ).toBe(false);
    expect(
      transitionSchema.parse({
        to: "quoted",
        note: "",
        quote_amount: "2500",
        quote_currency: "eur",
        quote_note: "",
      }),
    ).toMatchObject({ quote_amount: 2500, quote_currency: "EUR" });
  });
});

describe("messageSchema", () => {
  it("trims and reads the internal checkbox", () => {
    expect(messageSchema.parse({ body: "  hi  ", internal: "on" })).toEqual({
      body: "hi",
      internal: true,
    });
    expect(messageSchema.safeParse({ body: "   " }).success).toBe(false);
  });
});

describe("workflow mirror", () => {
  it("matches the transitions in the database function", () => {
    const sql = readFileSync(
      "supabase/migrations/20261023000000_bookings.sql",
      "utf8",
    );
    for (const [from, targets] of Object.entries(STAFF_TRANSITIONS)) {
      if (!targets.length) continue;
      const list = targets.map((to) => `'${to}'`).join(", ");
      expect(sql).toContain(`when '${from}' then array[${list}]`);
    }
  });
});

describe("bookingErrorMessage", () => {
  it("maps database errors to friendly text", () => {
    expect(bookingErrorMessage({ message: "rate_limited" })).toMatch(/hour/);
    expect(bookingErrorMessage({ code: "42501" })).toMatch(/can't/);
  });
});
