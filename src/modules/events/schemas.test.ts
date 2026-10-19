import { describe, expect, it } from "vitest";
import { fieldErrorsOf } from "@/lib/forms";
import { createEventSchema, eventDetailsSchema, lineupSchema } from "./schemas";

describe("createEventSchema", () => {
  it("stores times in UTC and derives a dated slug", () => {
    expect(
      createEventSchema.parse({
        title: "Ozora Festival",
        starts_at: "2026-07-27T12:00",
        timezone: "Europe/Budapest",
      }),
    ).toMatchObject({
      slug: "ozora-festival-2026",
      starts_at: "2026-07-27T10:00:00.000Z",
      ends_at: null,
    });
  });
});

const details = {
  title: "Boom",
  slug: "boom-2026",
  summary: "",
  description: "",
  starts_at: "2026-07-22T10:00",
  ends_at: "2026-07-29T18:00",
  timezone: "Europe/Lisbon",
  venue_name: "Lake",
  city: "Idanha-a-Nova",
  country: "pt",
  ticket_url: "",
  status: "published",
};

describe("eventDetailsSchema", () => {
  it("converts both ends and normalises optional fields", () => {
    expect(eventDetailsSchema.parse(details)).toMatchObject({
      starts_at: "2026-07-22T09:00:00.000Z",
      ends_at: "2026-07-29T17:00:00.000Z",
      country: "PT",
      ticket_url: null,
      featured: false,
    });
  });

  it("rejects an end before the start, and http ticket links", () => {
    const result = eventDetailsSchema.safeParse({
      ...details,
      ends_at: "2026-07-21T10:00",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrorsOf(result.error).ends_at).toEqual([
        "The end must be after the start.",
      ]);
    }
    expect(
      eventDetailsSchema.safeParse({
        ...details,
        ticket_url: "http://tickets.example",
      }).success,
    ).toBe(false);
  });
});

describe("lineupSchema", () => {
  const id = "3f1c1c9e-6c55-4a8a-9d4e-1f7f0a2b3c4d";
  it("rejects duplicate artists", () => {
    expect(
      lineupSchema.safeParse([
        { artist_id: id, stage: "", set_starts_at: "" },
        { artist_id: id, stage: "Main", set_starts_at: "" },
      ]).success,
    ).toBe(false);
  });
});
