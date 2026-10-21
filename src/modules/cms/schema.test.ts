import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAGES,
  DEFAULT_SETTINGS,
  emptySectionContent,
  PAGES,
} from "./pages";
import {
  hrefSchema,
  parsePageContent,
  parseSettings,
  SECTION_TYPES,
  type Section,
} from "./schema";

describe("built-in content", () => {
  it.each(Object.keys(DEFAULT_PAGES))("page %s validates", (key) => {
    const result = parsePageContent(
      DEFAULT_PAGES[key as keyof typeof DEFAULT_PAGES],
    );
    expect(
      result.success,
      JSON.stringify(!result.success && result.error.issues),
    ).toBe(true);
  });

  it("every page keeps exactly its built-in blocks", () => {
    for (const [key, page] of Object.entries(DEFAULT_PAGES)) {
      const blocks = page.sections.flatMap((section) =>
        section.type === "builtin" ? [section.content.block] : [],
      );
      expect(blocks.sort()).toEqual(
        [...PAGES[key as keyof typeof PAGES].builtins].sort(),
      );
    }
  });

  it("settings validate", () => {
    expect(parseSettings(DEFAULT_SETTINGS).success).toBe(true);
  });

  it("a new section of every type validates", () => {
    for (const type of SECTION_TYPES) {
      const section = {
        id: "new-one",
        type,
        visible: true,
        content: emptySectionContent(type),
      } as Section;
      const result = parsePageContent({
        seo: { title: "", description: "", image: "" },
        sections: [section],
      });
      expect(result.success, type).toBe(true);
    }
  });
});

describe("links", () => {
  it.each([
    "/artists",
    "#request",
    "https://example.com/x",
    "mailto:a@b.co",
    "tel:+49 30 123",
    "",
  ])("accepts %s", (href) => {
    expect(hrefSchema.safeParse(href).success).toBe(true);
  });

  it.each([
    "javascript:alert(1)",
    "//evil.example",
    "http://plain.example",
    "data:text/html,x",
    "/a b",
  ])("rejects %s", (href) => {
    expect(hrefSchema.safeParse(href).success).toBe(false);
  });
});

describe("validation", () => {
  it("rejects unknown section types", () => {
    const bad = {
      seo: { title: "", description: "", image: "" },
      sections: [{ id: "x1", type: "script", visible: true, content: {} }],
    };
    expect(parsePageContent(bad).success).toBe(false);
  });

  it("rejects image references that are not ids", () => {
    const page = structuredClone(DEFAULT_PAGES.home);
    (page.sections[0].content as { image: string }).image = "<img src=x>";
    expect(parsePageContent(page).success).toBe(false);
  });
});
