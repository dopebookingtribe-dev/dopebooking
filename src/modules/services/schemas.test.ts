import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DETAIL_FIELDS,
  describeDetails,
  detailsSchema,
  readDetails,
  SERVICE_STAFF_TRANSITIONS,
  serviceRequestSchema,
} from "./schemas";

function form(entries: [string, string][]) {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
}

describe("type-specific details", () => {
  it("reads, validates and describes catering answers", () => {
    const raw = readDetails(
      "catering",
      form([
        ["d.service_style", "crew"],
        ["d.service_style", "artist"],
        ["d.people_per_meal", "250"],
        ["d.meals_per_day", ""],
        ["d.dietary", "vegan"],
        ["d.power_water", "yes"],
      ]),
    );
    const parsed = detailsSchema("catering").parse(raw);
    expect(parsed).toEqual({
      service_style: ["crew", "artist"],
      people_per_meal: 250,
      meals_per_day: null,
      dietary: ["vegan"],
      power_water: true,
    });
    expect(describeDetails("catering", parsed)).toEqual([
      ["What do you need?", "Crew catering, Artist hospitality"],
      ["People per meal", "250"],
      ["Dietary needs", "Vegan"],
      ["Power and water on site?", "Yes"],
    ]);
  });

  it("enforces required multi-choice and known options", () => {
    const result = detailsSchema("promotion").safeParse(
      readDetails("promotion", form([["d.event_url", "http://x.example"]])),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path[0]).sort();
      expect(paths).toEqual(["channels", "event_url"]);
    }
    expect(
      detailsSchema("photography").safeParse(
        readDetails("photography", form([["d.deliverables", "everything"]])),
      ).success,
    ).toBe(false);
  });

  it("has unique field names per type", () => {
    for (const fields of Object.values(DETAIL_FIELDS)) {
      const names = fields.map((field) => field.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });
});

describe("serviceRequestSchema", () => {
  const base = {
    service_type: "aftermovie",
    event_name: "Forest Gathering",
    organisation: "",
    event_start: "2099-08-14",
    event_end: "2099-08-12",
    city: "Berlin",
    country: "DE",
    venue_name: "",
    expected_attendance: "",
    budget_amount: "",
    budget_currency: "EUR",
    message: "",
    contact_phone: "",
  };
  it("rejects an end before the start", () => {
    const result = serviceRequestSchema.safeParse(base);
    expect(result.success).toBe(false);
    expect(
      serviceRequestSchema.safeParse({ ...base, event_end: "" }).success,
    ).toBe(true);
  });
});

describe("workflow mirror", () => {
  it("matches the transitions in the database function", () => {
    const sql = readFileSync(
      "supabase/migrations/20261024000000_service_requests.sql",
      "utf8",
    );
    for (const [from, targets] of Object.entries(SERVICE_STAFF_TRANSITIONS)) {
      if (!targets.length) continue;
      const list = targets.map((to) => `'${to}'`).join(", ");
      expect(sql).toContain(`when '${from}' then array[${list}]`);
    }
  });
});
