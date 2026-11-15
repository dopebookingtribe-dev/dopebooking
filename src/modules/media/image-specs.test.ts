import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkImage, fitBadge, worstLevel } from "./image-check";
import {
  CONTAINERS,
  IMAGE_SPECS,
  IMAGE_SPEC_LIST,
  containerRatio,
  cropWindow,
  croppingFrames,
  deviceViews,
  frameRatios,
  ratioLabel,
  safeArea,
  specBrief,
  type ContainerKey,
} from "./image-specs";

const ratio = ([w, h]: readonly [number, number]) => w / h;
const near = (a: number, b: number, tolerance = 0.01) =>
  Math.abs(Math.log(a / b)) < tolerance;

describe("containerRatio", () => {
  it("follows the breakpoint classes the front end uses", () => {
    expect(containerRatio(CONTAINERS.eventShowcase, 390)).toBeCloseTo(4 / 5);
    expect(containerRatio(CONTAINERS.eventShowcase, 768)).toBeCloseTo(16 / 9);
    expect(containerRatio(CONTAINERS.eventShowcase, 1440)).toBeCloseTo(21 / 9);
    expect(containerRatio(CONTAINERS.video, 390)).toBeCloseTo(16 / 9);
    expect(containerRatio(CONTAINERS.artistLens, 1440)).toBe(1);
  });

  it("throws on a class string without an aspect ratio", () => {
    expect(() => containerRatio("rounded-full", 390)).toThrow();
  });
});

describe("ratioLabel", () => {
  it.each([
    [1920, 1080, "16:9"],
    [2560, 1280, "2:1"],
    [1200, 630, "1.91:1"],
    [1080, 1350, "4:5"],
    [1000, 700, "10:7"],
  ])("%i × %i is %s", (w, h, label) => {
    expect(ratioLabel(w, h)).toBe(label);
  });
});

describe("image specs", () => {
  it("keep companions linked both ways", () => {
    for (const spec of IMAGE_SPEC_LIST) {
      if (spec.mobile) {
        expect(IMAGE_SPECS[spec.mobile].fallbackFor).toBe(spec.id);
      }
      if (spec.fallbackFor) {
        expect(IMAGE_SPECS[spec.fallbackFor].mobile).toBe(spec.id);
        // Every phone frame says which screens get the phone image.
        for (const frame of spec.frames) expect(frame.when).toBeDefined();
      }
    }
  });

  it("have a minimum no larger than the recommended size, same shape", () => {
    for (const spec of IMAGE_SPEC_LIST) {
      expect(spec.min[0]).toBeLessThanOrEqual(spec.size[0]);
      expect(spec.min[1]).toBeLessThanOrEqual(spec.size[1]);
      if (!spec.anyRatio) {
        expect(near(ratio(spec.min), ratio(spec.size), 0.02)).toBe(true);
      }
    }
  });

  it("design canvases sit within the shapes they are cropped to", () => {
    for (const spec of IMAGE_SPEC_LIST) {
      if (spec.anyRatio || spec.fit !== "crop") continue;
      const ratios = croppingFrames(spec).flatMap((f) => frameRatios(f)!);
      const canvas = ratio(spec.size);
      expect(canvas, spec.id).toBeGreaterThanOrEqual(
        Math.min(...ratios) - 0.01,
      );
      expect(canvas, spec.id).toBeLessThanOrEqual(Math.max(...ratios) + 0.01);
      // Frames of a single shape: the canvas is exactly that shape.
      if (new Set(ratios.map((r) => r.toFixed(3))).size === 1) {
        expect(near(canvas, ratios[0]), spec.id).toBe(true);
      }
    }
  });

  it("are about twice the largest size on screen (sharp on retina)", () => {
    for (const spec of IMAGE_SPEC_LIST) {
      const widest = Math.max(
        ...spec.frames.map((frame) =>
          typeof frame.shown === "number"
            ? frame.shown
            : (frame.shown?.[0] ?? 0),
        ),
      );
      if (spec.fit === "texture") continue;
      expect(spec.size[0], spec.id).toBeGreaterThanOrEqual(
        Math.min(widest * 1.5, 1600),
      );
    }
  });

  it("name front-end files that exist", () => {
    for (const spec of IMAGE_SPEC_LIST) {
      for (const entry of spec.code) {
        const file = entry.split(" (")[0];
        expect(existsSync(file), `${spec.id}: ${file}`).toBe(true);
      }
    }
  });

  it("are the frames the front end really uses", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.tsx?$/.test(name) && !name.endsWith(".test.ts")) {
          files.push(path);
        }
      }
    };
    walk("src");
    const source = files
      .filter((file) => !file.endsWith("image-specs.ts"))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    for (const key of Object.keys(CONTAINERS) as ContainerKey[]) {
      expect(source.includes(`CONTAINERS.${key}`), key).toBe(true);
    }
  });
});

describe("safeArea", () => {
  it("is the whole canvas when every frame has its shape", () => {
    expect(safeArea(IMAGE_SPECS["video-poster"])).toEqual({
      x: 0,
      y: 0,
      w: 1,
      h: 1,
    });
  });

  it("shrinks to what every screen keeps", () => {
    const box = safeArea(IMAGE_SPECS["event-cover"]);
    // 16:9 canvas: the 4:3 card trims the sides, 21:9 the top and bottom.
    expect(box.w).toBeCloseTo(0.75, 2);
    expect(box.h).toBeLessThan(0.8);
    expect(box.x).toBeCloseTo((1 - box.w) / 2, 5);
  });

  it("ignores frames that only apply without a phone image", () => {
    const box = safeArea(IMAGE_SPECS["hero-photo"]);
    expect(box.w).toBeGreaterThan(0.6);
  });
});

describe("cropWindow", () => {
  it("keeps the full width when the frame is wider", () => {
    expect(cropWindow(16 / 9, 21 / 9)).toMatchObject({ x: 0, w: 1 });
  });
  it("stays inside the canvas around an edge focus point", () => {
    const box = cropWindow(2, 1, 1, { x: 0.95, y: 0.5 });
    expect(box.x + box.w).toBeCloseTo(1);
  });
});

describe("deviceViews", () => {
  it("folds the phone image into its main placement", () => {
    const [desktop, tablet, mobile] = deviceViews(IMAGE_SPECS["hero-photo"]);
    expect(desktop.uploads.map((u) => u.id)).toEqual(["hero-photo"]);
    expect(tablet.uploads.map((u) => u.id)).toEqual([
      "hero-photo",
      "hero-photo-mobile",
    ]);
    expect(mobile.uploads.map((u) => u.id)).toEqual(["hero-photo-mobile"]);
  });

  it("marks screens that don't show a placement", () => {
    const mobile = deviceViews(IMAGE_SPECS["services-row"])[2];
    expect(mobile.hidden).toBe(true);
  });
});

describe("checkImage", () => {
  const spec = IMAGE_SPECS["event-cover"];
  const facts = (width: number, height: number, bytes = 500_000) => ({
    width,
    height,
    bytes,
    type: "image/jpeg",
  });

  it("is happy with the recommended size", () => {
    expect(worstLevel(checkImage(spec, facts(2400, 1350)))).toBe("ok");
  });

  it("warns when a photo is too small", () => {
    const findings = checkImage(spec, facts(1200, 675));
    expect(worstLevel(findings)).toBe("warn");
    expect(findings[0].text).toMatch(/Too small/);
  });

  it("explains how much a wrong shape loses", () => {
    const findings = checkImage(spec, facts(2400, 2400));
    const crop = findings.find((f) => f.text.startsWith("Taller"));
    expect(crop?.level).toBe("warn");
    expect(crop?.text).toMatch(/44% will be cut from the top and bottom/);
  });

  it("only notes a slightly different shape", () => {
    const findings = checkImage(spec, facts(2400, 1500));
    expect(findings.find((f) => f.text.startsWith("Taller"))?.level).toBe(
      "info",
    );
  });

  it("judges any-shape placements by the long side", () => {
    const gallery = IMAGE_SPECS["gallery-photo"];
    expect(worstLevel(checkImage(gallery, facts(1600, 2400)))).toBe("ok");
    expect(worstLevel(checkImage(gallery, facts(900, 600)))).toBe("warn");
  });

  it("warns about heavy kaleidoscope textures", () => {
    const texture = IMAGE_SPECS["hero-kaleidoscope"];
    const findings = checkImage(texture, facts(2000, 2000, 5_000_000));
    expect(worstLevel(findings)).toBe("warn");
  });

  it("gives library photos a short badge", () => {
    expect(fitBadge(spec, 2400, 1350).label).toBe("Fits");
    expect(fitBadge(spec, 800, 450).label).toBe("Too small");
    expect(fitBadge(spec, 1800, 2400).label).toBe("Heavy crop");
  });
});

describe("specBrief", () => {
  it("includes the phone image and the safe area", () => {
    const brief = specBrief(IMAGE_SPECS["hero-photo"]);
    expect(brief).toMatch(/2560 × 1280 px \(2:1\)/);
    expect(brief).toMatch(/Phones: separate image at 1440 × 2160 px \(2:3\)/);
    expect(brief).toMatch(/Safe area/);
  });
});
