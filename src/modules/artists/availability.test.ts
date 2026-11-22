import { describe, expect, it } from "vitest";
import { formatDateRange } from "./availability";

describe("formatDateRange", () => {
  it.each([
    ["2027-03-02", "2027-03-20", "2–20 Mar 2027"],
    ["2027-03-28", "2027-04-03", "28 Mar – 3 Apr 2027"],
    ["2026-12-30", "2027-01-02", "30 Dec 2026 – 2 Jan 2027"],
    ["2027-06-05", "2027-06-05", "5 Jun 2027"],
  ])("%s to %s", (start, end, expected) => {
    expect(formatDateRange(start, end)).toBe(expected);
  });
});
