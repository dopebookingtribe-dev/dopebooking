import { describe, expect, it } from "vitest";
import { titleFromFileName } from "./preview-audio";
import {
  amountSchema,
  createReleaseSchema,
  formatDuration,
  formatOfFile,
  isValidIban,
  MUSICAL_KEYS,
  musicCartSchema,
  musicSettingsSchema,
  payoutDetailsSchema,
  releaseDetailsSchema,
  trackSchema,
} from "./schemas";

const details = {
  title: "Forest Ritual",
  slug: "forest-ritual",
  genre_id: "",
  subgenre_id: "",
  bpm: "",
  musical_key: "",
  release_date: "",
  label: "",
  catalog_number: "",
  description: "",
  credits: "",
  price_amount: "1.99",
};

describe("release forms", () => {
  it("makes a slug from the title", () => {
    expect(
      createReleaseSchema.parse({
        title: "Night Shift EP",
        release_type: "ep",
      }),
    ).toEqual({
      title: "Night Shift EP",
      release_type: "ep",
      slug: "night-shift-ep",
    });
  });

  it("parses details with the price in cents and empties as null", () => {
    const parsed = releaseDetailsSchema.parse({
      ...details,
      bpm: "145",
      on_sale: "on",
    });
    expect(parsed.price_amount).toBe(199);
    expect(parsed.bpm).toBe(145);
    expect(parsed.on_sale).toBe(true);
    expect(parsed.genre_id).toBeNull();
    expect(parsed.release_date).toBeNull();
  });

  it.each([
    ["price_amount", "0.10"],
    ["price_amount", "2000"],
    ["price_amount", ""],
    ["bpm", "300"],
    ["bpm", "14.5"],
    ["musical_key", "H minor"],
    ["release_date", "03/11/2026"],
  ])("rejects %s = %s", (field, value) => {
    expect(
      releaseDetailsSchema.safeParse({ ...details, [field]: value }).success,
    ).toBe(false);
  });

  it("knows all 24 keys", () => {
    expect(MUSICAL_KEYS).toHaveLength(24);
    expect(MUSICAL_KEYS).toContain("F# minor");
  });

  it("normalises ISRCs", () => {
    expect(
      trackSchema.parse({ title: "A", bpm: "", musical_key: "", isrc: "" })
        .isrc,
    ).toBeNull();
    expect(
      trackSchema.parse({
        title: "A",
        bpm: "",
        musical_key: "",
        isrc: "DE-ABC-26-00001",
      }).isrc,
    ).toBe("DEABC2600001");
    expect(
      trackSchema.safeParse({
        title: "A",
        bpm: "",
        musical_key: "",
        isrc: "NOTANISRC",
      }).success,
    ).toBe(false);
  });
});

describe("files", () => {
  it.each([
    [{ name: "a.wav", type: "audio/x-wav" }, "wav"],
    [{ name: "a.flac", type: "" }, "flac"],
    [{ name: "a.AIF", type: "" }, "aiff"],
    [{ name: "a.mp3", type: "audio/mpeg" }, "mp3"],
    [{ name: "a.zip", type: "application/zip" }, null],
  ])("%o -> %s", (file, format) => {
    expect(formatOfFile(file)).toBe(format);
  });

  it("formats durations", () => {
    expect(formatDuration(365)).toBe("6:05");
    expect(formatDuration(3725)).toBe("1:02:05");
    expect(formatDuration(null)).toBe("");
  });

  it.each([
    ["03_Forest-Ritual (Original Mix).wav", "Forest-Ritual (Original Mix)"],
    ["1. Opening.flac", "Opening"],
    ["Deep_Space.mp3", "Deep Space"],
    [".wav", "Untitled"],
  ])("titles %s as %s", (name, title) => {
    expect(titleFromFileName(name)).toBe(title);
  });
});

describe("money forms", () => {
  it("checks IBANs with the checksum", () => {
    expect(isValidIban("DE89 3704 0044 0532 0130 00")).toBe(true);
    expect(isValidIban("GB82WEST12345698765432")).toBe(true);
    expect(isValidIban("DE89 3704 0044 0532 0130 01")).toBe(false);
    expect(isValidIban("hello")).toBe(false);
  });

  it("cleans payout details", () => {
    expect(
      payoutDetailsSchema.parse({
        account_holder: "Anna Artist",
        iban: "de89 3704 0044 0532 0130 00",
        bic: "cobadeffxxx",
        country: "de",
      }),
    ).toEqual({
      account_holder: "Anna Artist",
      iban: "DE89370400440532013000",
      bic: "COBADEFFXXX",
      country: "DE",
    });
  });

  it("reads amounts and settings", () => {
    expect(amountSchema.parse({ amount: "25,50" }).amount).toBe(2550);
    expect(amountSchema.safeParse({ amount: "0" }).success).toBe(false);
    expect(
      musicSettingsSchema.parse({
        commission_percent: "12.5",
        hold_days: "14",
        min_withdrawal: "20",
      }),
    ).toEqual({
      commission_percent: 12.5,
      hold_days: 14,
      min_withdrawal: 2000,
    });
    expect(
      musicSettingsSchema.safeParse({
        commission_percent: "60",
        hold_days: "14",
        min_withdrawal: "20",
      }).success,
    ).toBe(false);
  });

  it("accepts only release ids in the music cart", () => {
    expect(
      musicCartSchema.safeParse(["9b2f1c3e-8a4d-4f6b-9c1e-2d3a4b5c6d7e"])
        .success,
    ).toBe(true);
    expect(musicCartSchema.safeParse(["drop table"]).success).toBe(false);
  });
});
