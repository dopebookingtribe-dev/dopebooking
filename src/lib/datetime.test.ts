import { describe, expect, it } from "vitest";
import {
  formatEventRange,
  formatEventTime,
  isTimeZone,
  utcToZonedInput,
  zonedInputToUtc,
} from "./datetime";

describe("zonedInputToUtc", () => {
  it.each([
    // Summer (CEST, UTC+2) and winter (CET, UTC+1) in Berlin.
    ["2026-08-14T22:00", "Europe/Berlin", "2026-08-14T20:00:00.000Z"],
    ["2026-01-10T22:00", "Europe/Berlin", "2026-01-10T21:00:00.000Z"],
    // Lisbon summer (UTC+1), Goa-style India (+5:30), São Paulo (-3).
    ["2026-08-14T23:30", "Europe/Lisbon", "2026-08-14T22:30:00.000Z"],
    ["2026-12-31T23:00", "Asia/Kolkata", "2026-12-31T17:30:00.000Z"],
    ["2026-03-01T04:00", "America/Sao_Paulo", "2026-03-01T07:00:00.000Z"],
    ["2026-06-01T00:00", "UTC", "2026-06-01T00:00:00.000Z"],
  ])("%s in %s", (local, zone, expected) => {
    expect(zonedInputToUtc(local, zone)).toBe(expected);
  });

  it("resolves a DST gap forward (Berlin 29 Mar 2026, 02:30 does not exist)", () => {
    expect(zonedInputToUtc("2026-03-29T02:30", "Europe/Berlin")).toBe(
      "2026-03-29T01:30:00.000Z",
    );
  });

  it.each([
    ["2026-02-30T10:00", "Europe/Berlin"],
    ["14/08/2026 22:00", "Europe/Berlin"],
    ["2026-08-14T22:00", "Mars/Olympus"],
  ])("rejects %s in %s", (local, zone) => {
    expect(zonedInputToUtc(local, zone)).toBeNull();
  });
});

describe("round trip", () => {
  it.each(["Europe/Berlin", "Asia/Kolkata", "America/Los_Angeles"])(
    "%s",
    (zone) => {
      const local = "2026-10-31T21:15";
      expect(utcToZonedInput(zonedInputToUtc(local, zone), zone)).toBe(local);
    },
  );
});

describe("formatting", () => {
  it("shows times in the event's zone, not the server's", () => {
    expect(formatEventTime("2026-08-14T20:00:00.000Z", "Europe/Berlin")).toBe(
      "22:00",
    );
  });

  it("formats ranges", () => {
    expect(
      formatEventRange(
        "2026-08-14T12:00:00Z",
        "2026-08-17T10:00:00Z",
        "Europe/Berlin",
      ),
    ).toMatch(/^14\s*–\s*17 Aug 2026$/);
    expect(
      formatEventRange("2026-08-14T12:00:00Z", null, "Europe/Berlin"),
    ).toBe("14 Aug 2026");
  });

  it("validates zones", () => {
    expect(isTimeZone("Europe/Berlin")).toBe(true);
    expect(isTimeZone("Nope/Nowhere")).toBe(false);
  });
});
