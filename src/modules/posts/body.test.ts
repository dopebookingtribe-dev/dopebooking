import { describe, expect, it } from "vitest";
import {
  embeddedIds,
  parseBody,
  parseInline,
  readingMinutes,
  safeHref,
} from "./body";

const ID = "3f1c1c9e-6c55-4a8a-9d4e-1f7f0a2b3c4d";

describe("parseBody", () => {
  it("splits paragraphs on blank lines and keeps single line breaks", () => {
    expect(parseBody("One\nstill one\n\nTwo")).toEqual([
      {
        type: "paragraph",
        content: [{ type: "text", text: "One\nstill one" }],
      },
      { type: "paragraph", content: [{ type: "text", text: "Two" }] },
    ]);
  });

  it("reads headings, lists and quotes", () => {
    const blocks = parseBody(
      "## Line-up\n- Nova\n- Orbit\n\n1. First\n2. Second\n\n> Best night ever",
    );
    expect(blocks.map((b) => b.type)).toEqual([
      "heading",
      "list",
      "list",
      "quote",
    ]);
    expect(blocks[1]).toMatchObject({ ordered: false });
    expect(blocks[2]).toMatchObject({ ordered: true });
  });

  it("turns library tokens into embeds", () => {
    const blocks = parseBody(
      `Intro\n[[photo:${ID}]]\n[[file:${ID.toUpperCase()}]]`,
    );
    expect(blocks.slice(1)).toEqual([
      { type: "embed", kind: "photo", id: ID },
      { type: "embed", kind: "file", id: ID },
    ]);
    expect(embeddedIds(blocks)).toEqual([ID, ID]);
  });

  it("embeds a lone video link but keeps other links as text", () => {
    const blocks = parseBody(
      "https://youtu.be/dQw4w9WgXcQ\n\nhttps://example.com",
    );
    expect(blocks[0]).toEqual({
      type: "video-link",
      source: { provider: "youtube", ref: "dQw4w9WgXcQ" },
    });
    expect(blocks[1].type).toBe("paragraph");
  });

  it("ignores malformed tokens", () => {
    expect(parseBody("[[photo:not-an-id]]")[0].type).toBe("paragraph");
  });

  it("estimates reading time", () => {
    expect(readingMinutes(parseBody("word ".repeat(660)))).toBe(3);
  });
});

describe("parseInline", () => {
  it("parses bold, italics and safe links", () => {
    expect(
      parseInline("A **big** *night* at [Boom](https://boomfestival.org)"),
    ).toEqual([
      { type: "text", text: "A " },
      { type: "strong", children: [{ type: "text", text: "big" }] },
      { type: "text", text: " " },
      { type: "em", children: [{ type: "text", text: "night" }] },
      { type: "text", text: " at " },
      {
        type: "link",
        href: "https://boomfestival.org/",
        children: [{ type: "text", text: "Boom" }],
      },
    ]);
  });

  it("reads inline code without parsing inside it", () => {
    expect(parseInline("cookie `sb-**x**`")).toEqual([
      { type: "text", text: "cookie " },
      { type: "code", text: "sb-**x**" },
    ]);
  });

  it("drops unsafe links but keeps their text", () => {
    expect(parseInline("[click](javascript:alert)")).toEqual([
      { type: "text", text: "click" },
    ]);
  });
});

describe("safeHref", () => {
  it.each([
    ["/artists", "/artists"],
    ["#tickets", "#tickets"],
    ["mailto:hi@example.com", "mailto:hi@example.com"],
    ["http://insecure.example", null],
    ["//evil.example", null],
    ["javascript:alert(1)", null],
  ])("%s", (input, expected) => {
    expect(safeHref(input)).toBe(expected);
  });
});
