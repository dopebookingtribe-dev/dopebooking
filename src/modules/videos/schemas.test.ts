import { describe, expect, it } from "vitest";
import { fieldErrorsOf } from "@/lib/forms";
import { createGallerySchema } from "@/modules/galleries/schemas";
import { createVideoSchema, videoDetailsSchema } from "./schemas";

describe("createVideoSchema", () => {
  it("parses the link into provider fields", () => {
    expect(
      createVideoSchema.parse({
        title: "Boom 2026 Aftermovie",
        url: "https://youtu.be/dQw4w9WgXcQ",
      }),
    ).toEqual({
      title: "Boom 2026 Aftermovie",
      slug: "boom-2026-aftermovie",
      provider: "youtube",
      provider_ref: "dQw4w9WgXcQ",
    });
  });

  it("explains unsupported links on the url field", () => {
    const result = createVideoSchema.safeParse({
      title: "Clip",
      url: "https://example.com/video.mp4",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrorsOf(result.error).url?.[0]).toMatch(/Mux, Cloudflare/);
    }
  });
});

describe("videoDetailsSchema", () => {
  it("accepts optional links to an event and artist", () => {
    const parsed = videoDetailsSchema.parse({
      title: "Set",
      slug: "set",
      url: "https://vimeo.com/76979871",
      description: "",
      event_id: "",
      artist_id: "3f1c1c9e-6c55-4a8a-9d4e-1f7f0a2b3c4d",
      status: "draft",
    });
    expect(parsed).toMatchObject({
      provider: "vimeo",
      provider_ref: "76979871",
      event_id: null,
      featured: false,
    });
  });
});

describe("createGallerySchema", () => {
  it("derives a slug", () => {
    expect(createGallerySchema.parse({ title: "Ozora 2026 — Day 1" })).toEqual({
      title: "Ozora 2026 — Day 1",
      slug: "ozora-2026-day-1",
    });
  });
});
