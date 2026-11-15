import {
  formatBytes,
  isRound,
  ratioLabel,
  sizeLabel,
  type ImageSpec,
} from "./image-specs";

/*
 * Advice for one chosen file against the placement it is meant for. It
 * never blocks an upload (the bucket's type and size limits do that); it
 * warns about photos that will look soft, lose a lot to cropping or load
 * slowly, and says plainly when a photo fits.
 */

export type Level = "ok" | "info" | "warn";
export type Finding = { level: Level; text: string };
export type ImageFacts = {
  width: number;
  height: number;
  bytes: number;
  type: string;
};

const BIG_PNG = 2 * 1024 * 1024;

export function checkImage(spec: ImageSpec, image: ImageFacts): Finding[] {
  const findings: Finding[] = [];
  const add = (level: Level, text: string) => findings.push({ level, text });
  const { width, height } = image;
  const [designW, designH] = spec.size;
  const [minW, minH] = spec.min;
  const target = designW / designH;
  const own = width / height;
  const dims = `${width} × ${height} px`;
  const shapeMatters = spec.fit === "crop" && !spec.anyRatio;

  // Sharpness. For fixed shapes, judge the part left after cropping.
  if (shapeMatters) {
    const usableW = Math.min(width, height * target);
    const usableH = usableW / target;
    if (usableW < minW - 0.5 || usableH < minH - 0.5) {
      add(
        "warn",
        `Too small: ${dims}${Math.abs(Math.log(own / target)) >= 0.03 ? ` (${Math.round(usableW)} × ${Math.round(usableH)} px once cropped to ${ratioLabel(designW, designH)})` : ""}. Below the minimum of ${sizeLabel(spec.min)}, it will look soft or blurry. Design at ${sizeLabel(spec.size)}.`,
      );
    } else if (usableW < designW * 0.9) {
      const cropped =
        Math.abs(Math.log(own / target)) >= 0.03
          ? `${Math.round(usableW)} × ${Math.round(usableH)} px once cropped`
          : dims;
      add(
        "info",
        `Big enough (${cropped}). ${sizeLabel(spec.size)} would look sharper on large high-density screens.`,
      );
    } else {
      add("ok", `Sharp on every screen: ${dims}.`);
    }
  } else {
    const long = Math.max(width, height);
    const minLong = Math.max(minW, minH);
    const designLong = Math.max(designW, designH);
    if (long < minLong) {
      add(
        "warn",
        `Too small: ${dims}. The long side should be at least ${minLong} px (ideally ${designLong} px), or it will look soft.`,
      );
    } else if (long < designLong * 0.9) {
      add(
        "info",
        `Big enough (${dims}). ${designLong} px on the long side would look sharper on large high-density screens.`,
      );
    } else {
      add("ok", `Sharp on every screen: ${dims}.`);
    }
  }

  // Shape and cropping.
  if (shapeMatters) {
    const off = Math.abs(Math.log(own / target));
    if (off < 0.03) {
      add("ok", `Right shape: ${ratioLabel(width, height)}.`);
    } else {
      const wider = own > target;
      const lost = Math.round(
        (1 - (wider ? target / own : own / target)) * 100,
      );
      add(
        lost >= 20 ? "warn" : "info",
        `${wider ? "Wider" : "Taller"} than ${ratioLabel(designW, designH)} (this photo is ${ratioLabel(width, height)}): about ${lost}% will be cut from the ${wider ? "left and right" : "top and bottom"}. It is cropped, never stretched.`,
      );
    }
  } else if (spec.fit === "texture") {
    add("info", "Used as a kaleidoscope texture, so its shape doesn't matter.");
  } else if (spec.fit === "full") {
    add("ok", "Shown whole, at its own shape.");
  }
  if (isRound(spec)) add("info", "Shown in a circle: the corners won't show.");

  // Weight.
  if (spec.heavy && image.bytes > spec.heavy) {
    add(
      "warn",
      `${formatBytes(image.bytes)} is heavy for this spot: the original file loads as is. Under ${formatBytes(spec.heavy)} keeps the page fast; save it as JPG or WebP, or smaller.`,
    );
  } else if (image.type === "image/png" && image.bytes > BIG_PNG) {
    add(
      "info",
      `Large PNG (${formatBytes(image.bytes)}). Saved as JPG or WebP a photo looks the same and uploads faster.`,
    );
  }
  if (Math.max(width, height) > Math.max(designW, designH) * 2.5) {
    add(
      "info",
      `Much larger than needed. Visitors get a resized copy, but a ${sizeLabel(spec.size)} version uploads faster.`,
    );
  }

  return findings;
}

const RANK: Record<Level, number> = { ok: 0, info: 1, warn: 2 };

export function worstLevel(findings: Finding[]): Level {
  return findings.reduce<Level>(
    (worst, { level }) => (RANK[level] > RANK[worst] ? level : worst),
    "ok",
  );
}

/** One short badge for a library photo in a picker. */
export function fitBadge(
  spec: ImageSpec,
  width: number,
  height: number,
): { level: Level; label: string } {
  const findings = checkImage(spec, {
    width,
    height,
    bytes: 0,
    type: "",
  });
  const level = worstLevel(findings);
  if (level !== "warn") return { level, label: "Fits" };
  const small = findings.some(
    (finding) =>
      finding.level === "warn" && finding.text.startsWith("Too small"),
  );
  return { level, label: small ? "Too small" : "Heavy crop" };
}
