import { describe, expect, it } from "vitest";
import { parsePublicEnv } from "./env";

const valid = {
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
};

describe("parsePublicEnv", () => {
  it("accepts a complete environment", () => {
    expect(parsePublicEnv(valid)).toEqual(valid);
  });

  it("names missing variables without leaking values", () => {
    const secretLooking = "sb_publishable_should_not_appear";
    expect(() =>
      parsePublicEnv({
        ...valid,
        NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
        EXTRA: secretLooking,
      }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
    try {
      parsePublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "not-a-url" });
    } catch (error) {
      expect(String(error)).not.toContain("not-a-url");
    }
  });
});
