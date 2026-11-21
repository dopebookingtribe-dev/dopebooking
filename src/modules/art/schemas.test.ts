import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { artworkLines } from "./format";
import {
  collaborations,
  collaborationWeight,
  sortExhibitions,
} from "./relations";
import {
  ART_LINK_PLATFORMS,
  artExhibitionDetailsSchema,
  artworkDetailsSchema,
  COLLECTIONS,
  createArtArtistSchema,
  creditsSchema,
  DISCIPLINE_KEYS,
  exhibitionTiming,
  festivalSchema,
  formatDateRange,
  formatDimensions,
  PARTNER_KINDS,
  participantsSchema,
  ROLE_KEYS,
} from "./schemas";

const SQL = readFileSync(
  "supabase/migrations/20261121000100_art_gallery.sql",
  "utf8",
);
const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const C = "00000000-0000-4000-8000-00000000000c";

describe("lists mirror the database checks", () => {
  it.each([
    ["disciplines", DISCIPLINE_KEYS],
    ["roles", ROLE_KEYS],
    ["link platforms", Object.keys(ART_LINK_PLATFORMS)],
    ["collections", Object.keys(COLLECTIONS)],
    ["partner kinds", Object.keys(PARTNER_KINDS)],
  ])("%s", (_, keys) => {
    for (const key of keys) expect(SQL).toContain(`'${key}'`);
  });
});

describe("exhibition timing", () => {
  const today = "2027-07-10";
  it("is upcoming before it opens or without dates", () => {
    expect(exhibitionTiming("2027-07-11", "2027-07-15", today)).toBe(
      "upcoming",
    );
    expect(exhibitionTiming(null, null, today)).toBe("upcoming");
  });
  it("is on view from the first to the last day", () => {
    expect(exhibitionTiming("2027-07-10", "2027-07-12", today)).toBe("current");
    expect(exhibitionTiming("2027-07-01", "2027-07-10", today)).toBe("current");
    expect(exhibitionTiming("2027-07-10", null, today)).toBe("current");
  });
  it("is archive the day after it closes", () => {
    expect(exhibitionTiming("2027-07-01", "2027-07-09", today)).toBe("past");
    expect(exhibitionTiming("2027-07-09", null, today)).toBe("past");
  });
  it("sorts on view, then upcoming soonest first, then archive newest first", () => {
    const list = [
      { id: "old", timing: "past" as const, startsOn: "2024-01-01" },
      { id: "soon", timing: "upcoming" as const, startsOn: "2027-08-01" },
      { id: "tba", timing: "upcoming" as const, startsOn: null },
      { id: "now", timing: "current" as const, startsOn: "2027-07-09" },
      { id: "recent", timing: "past" as const, startsOn: "2026-06-01" },
    ];
    expect(sortExhibitions(list).map((e) => e.id)).toEqual([
      "now",
      "soon",
      "tba",
      "recent",
      "old",
    ]);
  });
});

describe("formatting", () => {
  it("formats date ranges compactly", () => {
    expect(formatDateRange("2027-07-08", "2027-07-12")).toBe("8–12 Jul 2027");
    expect(formatDateRange("2027-06-28", "2027-07-03")).toBe(
      "28 Jun – 3 Jul 2027",
    );
    expect(formatDateRange("2026-12-30", "2027-01-02")).toBe(
      "30 Dec 2026 – 2 Jan 2027",
    );
    expect(formatDateRange("2027-07-08", null)).toBe("8 Jul 2027");
    expect(formatDateRange(null, null, "Summer 2027")).toBe("Summer 2027");
    expect(formatDateRange(null, null)).toBe("Dates to be announced");
  });
  it("formats dimensions height × width × depth", () => {
    expect(formatDimensions({ height_cm: 220, width_cm: 160 })).toBe(
      "220 × 160 cm",
    );
    expect(
      formatDimensions({ height_cm: 180, width_cm: 90, depth_cm: 90.5 }),
    ).toBe("180 × 90 × 90.5 cm");
    expect(
      formatDimensions({ dimensions_note: "Variable, site-specific" }),
    ).toBe("Variable, site-specific");
    expect(formatDimensions({})).toBeNull();
  });
  it("builds wall-label lines", () => {
    expect(
      artworkLines({
        year: 2026,
        discipline: "live_painting",
        medium: "Acrylic",
        dimensions: "200 × 300 cm",
      }),
    ).toEqual(["2026", "Live painting", "Acrylic", "200 × 300 cm"]);
  });
});

/** What a submitted form contains: every field, empty ones as "". */
const blank = (keys: string) =>
  Object.fromEntries(keys.split(" ").map((k) => [k, ""]));

describe("forms", () => {
  it("makes a URL name from the artist name", () => {
    const result = createArtArtistSchema.safeParse({
      name: "Lucía Ferrán",
      slug: "",
    });
    expect(result.success && result.data).toEqual({
      name: "Lucía Ferrán",
      slug: "lucia-ferran",
      kind: "individual",
    });
  });

  it("checks exhibition dates and colours", () => {
    const base = {
      ...blank(
        "subtitle festival_id event_id venue_name city country starts_on ends_on date_note summary overview concept accent_color external_url seo_title seo_description",
      ),
      title: "Show",
      slug: "show",
      status: "draft",
      sort_order: "0",
    };
    expect(artExhibitionDetailsSchema.safeParse(base).success).toBe(true);
    expect(
      artExhibitionDetailsSchema.safeParse({ ...base, ends_on: "2027-01-01" })
        .success,
    ).toBe(false);
    expect(
      artExhibitionDetailsSchema.safeParse({
        ...base,
        starts_on: "2027-02-01",
        ends_on: "2027-01-01",
      }).success,
    ).toBe(false);
    expect(
      artExhibitionDetailsSchema.safeParse({ ...base, accent_color: "red" })
        .success,
    ).toBe(false);
    const ok = artExhibitionDetailsSchema.safeParse({
      ...base,
      accent_color: "#FFB13B",
    });
    expect(ok.success && ok.data.accent_color).toBe("#ffb13b");
  });

  it("reads physical sizes in centimetres", () => {
    const base = {
      ...blank(
        "year discipline medium width_cm height_cm depth_cm dimensions_note description",
      ),
      title: "W",
      slug: "w",
      status: "draft",
      sort_order: "0",
    };
    const result = artworkDetailsSchema.safeParse({
      ...base,
      height_cm: "85,5",
      width_cm: "120",
      depth_cm: "",
    });
    expect(
      result.success && [
        result.data.height_cm,
        result.data.width_cm,
        result.data.depth_cm,
      ],
    ).toEqual([85.5, 120, null]);
    expect(
      artworkDetailsSchema.safeParse({ ...base, width_cm: "-2" }).success,
    ).toBe(false);
    expect(
      artworkDetailsSchema.safeParse({ ...base, year: "1750" }).success,
    ).toBe(false);
    expect(
      artworkDetailsSchema.safeParse({ ...base, discipline: "knitting" })
        .success,
    ).toBe(false);
  });

  it("lists each artist once per exhibition, with at least one role", () => {
    expect(
      participantsSchema.safeParse([
        { art_artist_id: A, roles: ["curator", "live_painter"], note: "" },
      ]).success,
    ).toBe(true);
    expect(
      participantsSchema.safeParse([{ art_artist_id: A, roles: [], note: "" }])
        .success,
    ).toBe(false);
    expect(
      participantsSchema.safeParse([
        { art_artist_id: A, roles: ["boss"], note: "" },
      ]).success,
    ).toBe(false);
    expect(
      participantsSchema.safeParse([
        { art_artist_id: A, roles: ["artist"], note: "" },
        { art_artist_id: A, roles: ["curator"], note: "" },
      ]).success,
    ).toBe(false);
  });

  it("credits at least one artist, each once", () => {
    expect(creditsSchema.safeParse([]).success).toBe(false);
    expect(
      creditsSchema.safeParse([
        { art_artist_id: A, credit: "" },
        { art_artist_id: B, credit: "Light" },
      ]).success,
    ).toBe(true);
    expect(
      creditsSchema.safeParse([
        { art_artist_id: A, credit: "" },
        { art_artist_id: A, credit: "" },
      ]).success,
    ).toBe(false);
  });

  it("only accepts https festival websites", () => {
    const form = blank("slug city country description");
    expect(
      festivalSchema.safeParse({
        ...form,
        name: "Fest",
        website_url: "http://x.io",
      }).success,
    ).toBe(false);
    const ok = festivalSchema.safeParse({
      ...form,
      name: "Moon Fest",
      website_url: "https://x.io",
    });
    expect(ok.success && ok.data.slug).toBe("moon-fest");
  });
});

describe("collaborations", () => {
  const catalog = {
    exhibitions: [
      { id: "e1", artistIds: [A, B, C] },
      { id: "e2", artistIds: [A, B] },
    ],
    works: [
      { id: "w1", credits: [{ artist: { id: A } }, { artist: { id: B } }] },
      { id: "w2", credits: [{ artist: { id: C } }] },
    ],
  } as unknown as Parameters<typeof collaborations>[0];

  it("links artists who shared shows or made a work together", () => {
    const pairs = collaborations(catalog);
    const ab = pairs.find((p) => p.a === A && p.b === B)!;
    expect(ab.exhibitions).toEqual(["e1", "e2"]);
    expect(ab.works).toEqual(["w1"]);
    expect(collaborationWeight(ab)).toBe(4);
    const ac = pairs.find((p) => p.a === A && p.b === C)!;
    expect(ac.works).toEqual([]);
    expect(pairs).toHaveLength(3);
  });
});
