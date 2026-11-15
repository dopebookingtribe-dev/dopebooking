import Link from "next/link";
import type { CSSProperties } from "react";
import type { Finding } from "../image-check";
import {
  DEVICES,
  FORMAT_LABEL,
  IMAGE_SPECS,
  MAX_SIZE_LABEL,
  formatBytes,
  frameRatioLabel,
  frameRatios,
  frameShown,
  framesFor,
  isRound,
  ratioLabel,
  safeArea,
  sizeLabel,
  type Box,
  type Device,
  type Frame,
  type ImageSpec,
} from "../image-specs";

/*
 * The size guide shown next to every image field: the design canvas with its
 * safe area and text zone, how each screen crops it, and the numbers to use.
 * No hooks, so it renders on the server (guidelines page) and inside client
 * forms (uploader, page builder) alike.
 */

export type GuidePreview = {
  url: string;
  /** Focus point in % (media library), 50/50 when unset. */
  focus?: { x: number; y: number };
  /** Pixel size, for frames that keep the photo's own shape. */
  width?: number;
  height?: number;
};

const pct = (box: Box): CSSProperties => ({
  left: `${box.x * 100}%`,
  top: `${box.y * 100}%`,
  width: `${box.w * 100}%`,
  height: `${box.h * 100}%`,
});

const GRID: CSSProperties = {
  backgroundColor: "var(--surface-2)",
  backgroundImage:
    "linear-gradient(to right, color-mix(in oklab, var(--line-strong) 45%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--line-strong) 45%, transparent) 1px, transparent 1px)",
  backgroundSize: "12.5% 12.5%",
};

const KALEIDO: CSSProperties = {
  backgroundImage:
    "repeating-conic-gradient(from 0deg at 50% 50%, color-mix(in oklab, var(--accent) 55%, transparent) 0deg 18deg, color-mix(in oklab, var(--uv) 55%, transparent) 18deg 36deg)",
};

/** Where text sits on top of the photo: violet hatching. */
const TEXT_HATCH =
  "repeating-linear-gradient(135deg, color-mix(in oklab, var(--uv) 42%, transparent) 0 5px, color-mix(in oklab, var(--bg) 35%, transparent) 5px 10px)";

const DEVICE_TONE: Record<Device, string> = {
  desktop: "text-accent",
  tablet: "text-uv",
  mobile: "text-thread-cyan",
};

/** The design canvas: the photo (or a grid) with safe area and text zone. */
function CanvasArt({
  spec,
  preview,
  labels = true,
}: {
  spec: ImageSpec;
  preview?: GuidePreview;
  labels?: boolean;
}) {
  const safe = safeArea(spec);
  const round = isRound(spec);
  const texture = spec.fit === "texture";
  const position = preview?.focus
    ? `${preview.focus.x}% ${preview.focus.y}%`
    : "50% 50%";
  return (
    <>
      {preview ? (
        // Blob and storage URLs; next/image can't optimise blob: URLs.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview.url}
          alt=""
          className="absolute inset-0 size-full object-cover"
          style={{ objectPosition: position }}
        />
      ) : (
        <span aria-hidden className="absolute inset-0" style={GRID} />
      )}
      {texture ? (
        <span
          aria-hidden
          className="absolute inset-[22%] rounded-full border-2 border-dashed border-text/80 opacity-90"
          style={preview ? undefined : KALEIDO}
        />
      ) : (
        <>
          <span
            aria-hidden
            className={`absolute border-2 border-dashed border-text/90 shadow-[0_0_0_1px_var(--bg)] ${round ? "rounded-full" : "rounded-sm"}`}
            style={pct(safe)}
          />
          {spec.text ? (
            <span
              aria-hidden
              className="absolute overflow-hidden border border-uv/70"
              style={{
                ...pct({
                  x: spec.text.x / 100,
                  y: spec.text.y / 100,
                  w: spec.text.w / 100,
                  h: spec.text.h / 100,
                }),
                backgroundImage: TEXT_HATCH,
              }}
            >
              {labels ? (
                <span className="absolute bottom-1 left-1 max-w-[calc(100%-0.5rem)] truncate rounded-sm bg-bg px-1 text-[10px] leading-4 text-text">
                  {spec.text.label}
                </span>
              ) : null}
            </span>
          ) : null}
        </>
      )}
    </>
  );
}

function Canvas({
  spec,
  preview,
  width,
}: {
  spec: ImageSpec;
  preview?: GuidePreview;
  width: string;
}) {
  const [w, h] = spec.size;
  return (
    <figure className="flex shrink-0 flex-col gap-1.5" style={{ width }}>
      <div
        className="relative w-full overflow-hidden rounded-md outline outline-line-strong"
        style={{ aspectRatio: `${w} / ${h}` }}
      >
        <CanvasArt spec={spec} preview={preview} />
      </div>
      <figcaption className="font-label text-xs text-muted">
        Design canvas · {sizeLabel(spec.size)}
      </figcaption>
    </figure>
  );
}

/** One screen's frame, showing the canvas cropped the way the site crops it. */
function FrameBox({
  spec,
  frame,
  preview,
  height,
  maxWidth,
}: {
  spec: ImageSpec;
  frame: Frame;
  preview?: GuidePreview;
  height: number;
  maxWidth: number;
}) {
  const canvas = spec.size[0] / spec.size[1];
  const range = frameRatios(frame);
  const own =
    preview?.width && preview.height ? preview.width / preview.height : canvas;
  const ratio = range ? (range[0] + range[1]) / 2 : own;
  const width = Math.min(height * ratio, maxWidth);
  const boxHeight = width / ratio;
  const scale = ratio > canvas ? ratio / canvas : canvas / ratio;
  const fx = (preview?.focus?.x ?? 50) / 100;
  const fy = (preview?.focus?.y ?? 50) / 100;
  const inner: CSSProperties =
    ratio > canvas
      ? {
          left: 0,
          width: "100%",
          height: `${scale * 100}%`,
          top: `${-(scale - 1) * fy * 100}%`,
        }
      : {
          top: 0,
          height: "100%",
          width: `${scale * 100}%`,
          left: `${-(scale - 1) * fx * 100}%`,
        };
  const shown = frameShown(frame);

  return (
    <li className="flex flex-col gap-1" style={{ width: Math.max(width, 88) }}>
      {frame.hidden ? (
        <span
          className="flex items-center justify-center rounded-md border border-dashed border-line-strong text-[11px] text-muted"
          style={{ width: Math.max(width, 64), height: boxHeight }}
        >
          Hidden
        </span>
      ) : (
        <span
          className={`relative block overflow-hidden bg-surface-2 ${frame.shape === "circle" ? "rounded-full" : "rounded-md"} ${frame.fallback ? "opacity-70 outline outline-line-strong outline-dashed" : "outline outline-line-strong"}`}
          style={{ width, height: boxHeight }}
        >
          {preview ? (
            // The real photo, cropped by this frame the way the site does.
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.url}
                alt=""
                className="absolute inset-0 size-full object-cover"
                style={{ objectPosition: `${fx * 100}% ${fy * 100}%` }}
              />
              {spec.fit === "texture" ? (
                <span
                  aria-hidden
                  className="absolute inset-0 opacity-40 mix-blend-overlay"
                  style={KALEIDO}
                />
              ) : spec.text ? (
                <span
                  aria-hidden
                  className="absolute border border-uv/70"
                  style={{
                    ...pct({
                      x: spec.text.x / 100,
                      y: spec.text.y / 100,
                      w: spec.text.w / 100,
                      h: spec.text.h / 100,
                    }),
                    backgroundImage: TEXT_HATCH,
                  }}
                />
              ) : null}
            </>
          ) : (
            <span className="absolute" style={inner}>
              <CanvasArt spec={spec} labels={false} />
            </span>
          )}
        </span>
      )}
      <span className="text-[11px] leading-tight text-muted">
        <span className="text-text">{frame.label}</span>
        <br />
        {frame.hidden
          ? "Not shown"
          : [frameRatioLabel(frame), shown ? `${shown[0]} × ${shown[1]}` : null]
              .filter(Boolean)
              .join(" · ")}
      </span>
    </li>
  );
}

function DeviceFrames({
  spec,
  device,
  preview,
  compact,
}: {
  spec: ImageSpec;
  device: Device;
  preview?: GuidePreview;
  compact: boolean;
}) {
  const all = framesFor(spec, device);
  const limit = compact ? 2 : 4;
  const frames = all.slice(0, limit);
  const main = spec.fallbackFor ? IMAGE_SPECS[spec.fallbackFor] : null;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className={`font-label text-xs ${DEVICE_TONE[device]}`}>
        {DEVICES[device].label}
        <span className="text-muted"> · {DEVICES[device].width} px wide</span>
      </p>
      {frames.length ? (
        <ul className="flex flex-wrap items-end gap-3">
          {frames.map((frame) => (
            <FrameBox
              key={`${frame.label}-${frame.device}`}
              spec={spec}
              frame={frame}
              preview={preview}
              height={compact ? 48 : 64}
              maxWidth={compact ? 120 : 168}
            />
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted">
          {main ? "Shows the main image." : "Not shown."}
        </p>
      )}
      {all.length > limit ? (
        <p className="text-[11px] text-muted">
          +{all.length - limit} more:{" "}
          {all
            .slice(limit)
            .map((frame) => frame.label)
            .join(", ")}
        </p>
      ) : null}
    </div>
  );
}

/** "Phones: 1080 × 1620 px (2:3), on phones and tablets held upright." */
function companionNote(spec: ImageSpec) {
  if (spec.mobile) {
    const phone = IMAGE_SPECS[spec.mobile];
    const tablets = phone.frames.some((frame) => frame.when === "portrait");
    const where = tablets ? "phones and upright tablets" : "phones";
    return `${where[0].toUpperCase()}${where.slice(1)} get a separate image: ${sizeLabel(phone.size)} (${ratioLabel(...phone.size)}). Leave it empty and this photo is cropped to the centre on ${where}.`;
  }
  if (spec.fallbackFor) {
    return `Optional. Without it, the main ${sizeLabel(IMAGE_SPECS[spec.fallbackFor].size)} image is cropped to fit.`;
  }
  return null;
}

export function SpecFacts({ spec }: { spec: ImageSpec }) {
  const note = companionNote(spec);
  const rows: [string, string][] = [
    [
      "Design at",
      `${sizeLabel(spec.size)} (${spec.anyRatio ? `${ratioLabel(...spec.size)} suggested, any shape works` : ratioLabel(...spec.size)})`,
    ],
    ["Minimum", sizeLabel(spec.min)],
    ...(note ? [["Phones", note] as [string, string]] : []),
    [
      "Files",
      `${FORMAT_LABEL}, up to ${MAX_SIZE_LABEL}${spec.heavy ? ` (aim for under ${formatBytes(spec.heavy)})` : ""}`,
    ],
    ["Cropping", spec.crop],
  ];
  return (
    <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[7rem_1fr]">
      {rows.map(([term, value]) => (
        <div key={term} className="contents">
          <dt className="font-label text-xs text-muted sm:pt-0.5">{term}</dt>
          <dd className="mb-1.5 sm:mb-0">{value}</dd>
        </div>
      ))}
      {spec.tips?.length ? (
        <div className="contents">
          <dt className="font-label text-xs text-muted sm:pt-0.5">Tips</dt>
          <dd>
            <ul className="flex flex-col gap-1">
              {spec.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

export function Legend({ spec }: { spec: ImageSpec }) {
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
      {spec.fit === "texture" ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-full border-2 border-dashed border-text/90" />
          Area the pattern is drawn from
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5">
          <span
            className={`inline-block size-3 border-2 border-dashed border-text/90 ${isRound(spec) ? "rounded-full" : "rounded-sm"}`}
          />
          Safe area: visible on every screen
        </span>
      )}
      {spec.text ? (
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-4 rounded-sm border border-uv/70"
            style={{ backgroundImage: TEXT_HATCH }}
          />
          Text on top: keep faces and logos out
        </span>
      ) : null}
      {spec.frames.some((frame) => frame.fallback) && spec.mobile ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm outline outline-line-strong outline-dashed" />
          Only without a phone image
        </span>
      ) : null}
    </p>
  );
}

export function Findings({ findings }: { findings: Finding[] }) {
  if (!findings.length) return null;
  const tone = {
    ok: "text-success",
    info: "text-muted",
    warn: "text-accent",
  } as const;
  const mark = { ok: "✓", info: "•", warn: "!" } as const;
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {findings.map((finding) => (
        <li key={finding.text} className="flex gap-2">
          <span
            aria-hidden
            className={`w-3 shrink-0 text-center font-semibold ${tone[finding.level]}`}
          >
            {mark[finding.level]}
          </span>
          <span
            className={finding.level === "warn" ? "text-text" : "text-muted"}
          >
            <span className="sr-only">
              {finding.level === "warn"
                ? "Warning: "
                : finding.level === "ok"
                  ? "Good: "
                  : "Note: "}
            </span>
            {finding.text}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The full guide: numbers, canvas and per-screen previews. `compact` keeps
 * the numbers and previews visible and folds the rest into a disclosure.
 */
export function ImageGuide({
  spec,
  preview,
  compact = false,
  guidelinesHref,
  findings,
  className = "",
}: {
  spec: ImageSpec;
  preview?: GuidePreview;
  compact?: boolean;
  /** Link to the full reference (staff only). */
  guidelinesHref?: string;
  findings?: Finding[];
  className?: string;
}) {
  const devices = (Object.keys(DEVICES) as Device[]).filter(
    (device) => !compact || framesFor(spec, device).length,
  );
  const note = companionNote(spec);
  return (
    <section
      aria-label={`Image size guide: ${spec.title}`}
      className={`flex min-w-0 flex-col gap-4 rounded-(--radius) border border-line bg-surface-1/60 p-4 ${className}`}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm">
          <span className="font-label text-xs text-muted">Size guide · </span>
          <span className="font-medium">{spec.title}</span>
        </p>
        {guidelinesHref ? (
          <Link
            href={guidelinesHref}
            className="text-xs text-muted underline underline-offset-4 hover:text-text"
          >
            All image sizes
          </Link>
        ) : null}
      </header>

      <p className="text-sm">
        <span className="font-semibold text-accent">
          Design at {sizeLabel(spec.size)}
        </span>
        <span className="text-muted">
          {" "}
          · {spec.anyRatio ? "any shape" : ratioLabel(...spec.size)} · min{" "}
          {sizeLabel(spec.min)} · {FORMAT_LABEL}, up to {MAX_SIZE_LABEL}
          {spec.heavy ? ` (aim for under ${formatBytes(spec.heavy)})` : ""}
        </span>
      </p>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <Canvas
          spec={spec}
          preview={preview}
          width={compact ? "9rem" : "13rem"}
        />
        <div className="grid min-w-0 flex-1 grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-4 md:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
          {devices.map((device) => (
            <DeviceFrames
              key={device}
              spec={spec}
              device={device}
              preview={preview}
              compact={compact}
            />
          ))}
        </div>
      </div>

      <Legend spec={spec} />

      {findings?.length ? (
        <div className="border-t border-line pt-3">
          <Findings findings={findings} />
        </div>
      ) : null}

      {compact ? (
        <details className="group text-sm">
          <summary className="cursor-pointer text-xs text-muted hover:text-text">
            Cropping{note ? ", phone image" : ""} and tips
          </summary>
          <div className="mt-3">
            <SpecFacts spec={spec} />
          </div>
        </details>
      ) : (
        <SpecFacts spec={spec} />
      )}
    </section>
  );
}
