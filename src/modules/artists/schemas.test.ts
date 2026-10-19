import { describe, expect, it } from "vitest";
import { fieldErrorsOf } from "@/lib/forms";
import {
  artistDetailsSchema,
  artistLinksSchema,
  artistPrivateSchema,
  createArtistSchema,
  slugify,
} from "./schemas";

describe("slugify", () => {
  it.each([
    ["Astral Projection", "astral-projection"],
    ["  Ace  Ventura ", "ace-ventura"],
    ["Ørgasmic Ünit", "orgasmic-unit"],
    ["1200 Mics!!!", "1200-mics"],
    ["---", ""],
  ])("%s -> %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe("createArtistSchema", () => {
  it("derives a slug from the stage name", () => {
    expect(createArtistSchema.parse({ stage_name: "Vini Vici" })).toEqual({
      stage_name: "Vini Vici",
      slug: "vini-vici",
    });
  });

  it("rejects names that produce no usable slug", () => {
    expect(createArtistSchema.safeParse({ stage_name: "!!!" }).success).toBe(
      false,
    );
  });
});

const details = {
  stage_name: "Vini Vici",
  slug: "vini-vici",
  tagline: "",
  bio: "Israeli duo.",
  country: "il",
  based_in: "",
  genres: ["progressive", "psychedelic"],
  status: "published",
  featured: "on",
  sort_order: "2",
};

describe("artistDetailsSchema", () => {
  it("normalises optional fields", () => {
    const parsed = artistDetailsSchema.parse(details);
    expect(parsed).toMatchObject({
      tagline: null,
      based_in: null,
      country: "IL",
      featured: true,
      sort_order: 2,
    });
  });

  it("treats a missing checkbox as not featured", () => {
    const withoutCheckbox: Partial<typeof details> = { ...details };
    delete withoutCheckbox.featured;
    expect(artistDetailsSchema.parse(withoutCheckbox).featured).toBe(false);
  });

  it("rejects unknown genres and bad slugs", () => {
    const result = artistDetailsSchema.safeParse({
      ...details,
      slug: "Vini Vici",
      genres: ["polka"],
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(Object.keys(fieldErrorsOf(result.error)).sort()).toEqual([
      "genres",
      "slug",
    ]);
  });
});

describe("artistPrivateSchema", () => {
  it("parses fees and keeps them ordered", () => {
    expect(
      artistPrivateSchema.parse({
        fee_min: "1500",
        fee_max: "",
        fee_currency: "eur",
        booking_email: "",
        internal_notes: "",
      }),
    ).toEqual({
      fee_min: 1500,
      fee_max: null,
      fee_currency: "EUR",
      booking_email: null,
      internal_notes: null,
    });

    const result = artistPrivateSchema.safeParse({
      fee_min: "3000",
      fee_max: "1000",
      fee_currency: "EUR",
      booking_email: "",
      internal_notes: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("artistLinksSchema", () => {
  it("only accepts https links", () => {
    expect(
      artistLinksSchema.safeParse([
        { platform: "soundcloud", url: "https://soundcloud.com/x" },
      ]).success,
    ).toBe(true);
    expect(
      artistLinksSchema.safeParse([
        { platform: "soundcloud", url: "http://soundcloud.com/x" },
      ]).success,
    ).toBe(false);
    expect(
      artistLinksSchema.safeParse([
        { platform: "website", url: "javascript:alert(1)" },
      ]).success,
    ).toBe(false);
  });
});
