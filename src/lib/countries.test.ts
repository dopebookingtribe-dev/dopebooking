import { describe, expect, it } from "vitest";
import { COUNTRIES, countryName } from "./countries";

describe("countries", () => {
  it("names real countries and passes unknown codes through", () => {
    expect(countryName("DE")).toBe("Germany");
    expect(countryName("IL")).toBe("Israel");
    expect(countryName(null)).toBe("");
  });

  it("lists countries without pseudo-regions", () => {
    const codes = COUNTRIES.map((country) => country.code);
    expect(codes).toContain("DE");
    expect(codes).toContain("BR");
    expect(codes).not.toContain("EU");
    expect(codes).not.toContain("ZZ");
    expect(COUNTRIES.length).toBeGreaterThan(240);
  });
});
