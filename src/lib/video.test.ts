import { describe, expect, it } from "vitest";
import { embedUrl, parseVideoUrl, providerThumbnail, sourceUrl } from "./video";

describe("parseVideoUrl", () => {
  it.each([
    [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42",
      "youtube",
      "dQw4w9WgXcQ",
    ],
    ["https://youtu.be/dQw4w9WgXcQ?si=abc", "youtube", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/shorts/dQw4w9WgXcQ", "youtube", "dQw4w9WgXcQ"],
    [
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
      "youtube",
      "dQw4w9WgXcQ",
    ],
    ["https://vimeo.com/76979871", "vimeo", "76979871"],
    ["https://player.vimeo.com/video/76979871?h=x", "vimeo", "76979871"],
    [
      "https://player.mux.com/EcHgOK9coz5K4rjSwOkoE7Y7O01201YMIC",
      "mux",
      "EcHgOK9coz5K4rjSwOkoE7Y7O01201YMIC",
    ],
    [
      "https://stream.mux.com/EcHgOK9coz5K4rjSwOkoE7Y7O01201YMIC.m3u8",
      "mux",
      "EcHgOK9coz5K4rjSwOkoE7Y7O01201YMIC",
    ],
    [
      "https://customer-f33zs165nr7gyfy4.cloudflarestream.com/6b9e68b07dfee8cc2d116e4c51d6a957/watch",
      "cloudflare_stream",
      "customer-f33zs165nr7gyfy4/6b9e68b07dfee8cc2d116e4c51d6a957",
    ],
  ])("%s", (input, provider, ref) => {
    expect(parseVideoUrl(input)).toEqual({ provider, ref });
  });

  it.each([
    "not a url",
    "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://evil.example/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=%22%3E%3Cscript%3E",
    "https://vimeo.com/channels/staffpicks",
    "https://customer-x.cloudflarestream.com.evil.example/abc/watch",
    "javascript:alert(1)",
  ])("rejects %s", (input) => {
    expect(parseVideoUrl(input)).toBeNull();
  });
});

describe("embed helpers", () => {
  it("builds privacy-friendly embeds", () => {
    expect(embedUrl({ provider: "youtube", ref: "abc" })).toBe(
      "https://www.youtube-nocookie.com/embed/abc?autoplay=1&rel=0",
    );
    expect(embedUrl({ provider: "vimeo", ref: "123" })).toContain("dnt=1");
    expect(
      embedUrl({ provider: "cloudflare_stream", ref: "customer-x1/vid" }),
    ).toBe("https://customer-x1.cloudflarestream.com/vid/iframe?autoplay=true");
  });

  it("round-trips through the source URL", () => {
    for (const source of [
      { provider: "youtube", ref: "dQw4w9WgXcQ" },
      { provider: "vimeo", ref: "76979871" },
      { provider: "mux", ref: "abc123" },
      { provider: "cloudflare_stream", ref: "customer-x1/vid" },
    ] as const) {
      expect(parseVideoUrl(sourceUrl(source))).toEqual(source);
    }
  });

  it("knows which providers have free thumbnails", () => {
    expect(providerThumbnail({ provider: "vimeo", ref: "1" })).toBeNull();
    expect(providerThumbnail({ provider: "mux", ref: "a" })).toContain(
      "image.mux.com",
    );
  });
});
