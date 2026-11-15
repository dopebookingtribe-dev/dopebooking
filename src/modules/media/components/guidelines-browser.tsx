"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  DEVICES,
  FORMAT_LABEL,
  GROUPS,
  IMAGE_SPECS,
  IMAGE_SPEC_LIST,
  MAX_SIZE_LABEL,
  deviceViews,
  formatBytes,
  frameRatioLabel,
  frameRatios,
  frameShown,
  ratioLabel,
  sizeLabel,
  specBrief,
  type GroupKey,
  type ImageSpec,
  type ImageSpecId,
} from "../image-specs";
import { ImageGuide } from "./image-guide";

export type UsageMap = Partial<
  Record<ImageSpecId, { label: string; href: string }[]>
>;

/** Main placements; phone versions are folded into their main row. */
const ROWS = IMAGE_SPEC_LIST.filter((spec) => !spec.fallbackFor);

function haystack(spec: ImageSpec) {
  const phone = spec.mobile ? IMAGE_SPECS[spec.mobile] : null;
  return [
    spec.title,
    spec.where,
    spec.upload.label,
    GROUPS[spec.group].title,
    sizeLabel(spec.size),
    ratioLabel(...spec.size),
    phone
      ? `${phone.title} ${sizeLabel(phone.size)} ${ratioLabel(...phone.size)}`
      : "",
    spec.frames.map((frame) => frame.label).join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

function DeviceCell({
  spec,
  device,
}: {
  spec: ImageSpec;
  device: keyof typeof DEVICES;
}) {
  const view = deviceViews(spec).find((item) => item.device === device)!;
  if (view.hidden) return <p className="text-sm text-muted">Not shown</p>;
  const both = view.uploads.length > 1;
  return (
    <div className="flex flex-col gap-1.5">
      {view.uploads.map((upload) => (
        <p key={upload.id} className="text-sm">
          <span className="font-semibold">{sizeLabel(upload.size)}</span>
          <span className="text-muted">
            {" "}
            · {upload.anyRatio ? "any shape" : ratioLabel(...upload.size)}
          </span>
          {upload.fallbackFor ? (
            <span className="block text-xs text-uv">Phone image</span>
          ) : both ? (
            <span className="block text-xs text-muted">Main image</span>
          ) : null}
        </p>
      ))}
      <ul className="flex flex-col gap-0.5 text-xs text-muted">
        {view.frames
          .filter((frame) => !frame.hidden)
          .slice(0, 3)
          .map((frame) => {
            const shown = frameShown(frame);
            return (
              <li key={`${frame.from.id}-${frame.label}`}>
                {frame.label}: {frameRatioLabel(frame)}
                {shown ? `, ${shown[0]} × ${shown[1]}` : ""}
              </li>
            );
          })}
      </ul>
    </div>
  );
}

/** Small drawing of the frame on each screen, for scanning the list. */
function ShapeStrip({ spec }: { spec: ImageSpec }) {
  return (
    <div aria-hidden className="flex items-end gap-2">
      {deviceViews(spec).map((view) => {
        const frame = view.frames.find((item) => !item.hidden);
        if (!frame) {
          return (
            <span
              key={view.device}
              className="flex h-10 w-6 items-center justify-center rounded-sm border border-dashed border-line-strong text-[9px] text-muted"
            >
              –
            </span>
          );
        }
        const range = frameRatios(frame);
        const ratio = range
          ? (range[0] + range[1]) / 2
          : frame.from.size[0] / frame.from.size[1];
        const height = 40;
        const width = Math.min(height * ratio, 72);
        return (
          <span
            key={view.device}
            className={`block border border-line-strong bg-surface-2 ${frame.shape === "circle" ? "rounded-full" : "rounded-sm"}`}
            style={{ width, height: width / ratio }}
            title={DEVICES[view.device].label}
          />
        );
      })}
    </div>
  );
}

function CopyBrief({ spec }: { spec: ImageSpec }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(specBrief(spec));
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
      className="inline-flex min-h-9 items-center rounded-full border border-line-strong px-3 text-xs text-muted hover:border-text hover:text-text"
    >
      {copied ? "Copied" : "Copy brief for a designer"}
    </button>
  );
}

function SpecRow({
  spec,
  usage,
  open,
  onToggle,
}: {
  spec: ImageSpec;
  usage: UsageMap;
  open: boolean;
  onToggle: (open: boolean) => void;
}) {
  const phone = spec.mobile ? IMAGE_SPECS[spec.mobile] : null;
  const used = usage[spec.id] ?? [];
  return (
    <li
      id={spec.id}
      className="scroll-mt-28 rounded-(--radius) border border-line bg-surface-1 p-5"
    >
      {phone ? <span id={phone.id} className="block scroll-mt-28" /> : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl min-w-0">
          <h3 className="font-display text-2xl leading-tight">{spec.title}</h3>
          <p className="mt-2 text-sm text-muted">{spec.where}</p>
          <p className="mt-2 text-sm">
            <span className="font-label text-xs text-muted">Upload: </span>
            {spec.upload.href ? (
              <Link
                href={spec.upload.href}
                className="underline underline-offset-4 hover:text-accent"
              >
                {spec.upload.label}
              </Link>
            ) : (
              spec.upload.label
            )}
          </p>
          {used.length ? (
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
              <span className="font-label text-xs text-muted">Live on:</span>
              {used.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="rounded-full border border-line-strong px-2.5 py-0.5 text-xs hover:border-accent hover:text-accent"
                >
                  {item.label}
                </Link>
              ))}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <ShapeStrip spec={spec} />
          <CopyBrief spec={spec} />
        </div>
      </div>

      <dl className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,0.9fr)]">
        {(Object.keys(DEVICES) as (keyof typeof DEVICES)[]).map((device) => (
          <div key={device} className="min-w-0">
            <dt className="font-label text-xs text-muted">
              {DEVICES[device].label}
            </dt>
            <dd className="mt-1.5">
              <DeviceCell spec={spec} device={device} />
            </dd>
          </div>
        ))}
        <div className="min-w-0">
          <dt className="font-label text-xs text-muted">Files</dt>
          <dd className="mt-1.5 text-sm">
            {FORMAT_LABEL}
            <span className="block text-muted">
              Up to {MAX_SIZE_LABEL}
              {spec.heavy ? `; aim for under ${formatBytes(spec.heavy)}` : ""}
            </span>
          </dd>
        </div>
      </dl>

      <details
        className="mt-4 border-t border-line pt-4"
        open={open}
        onToggle={(event) => onToggle(event.currentTarget.open)}
      >
        <summary className="cursor-pointer text-sm text-muted hover:text-text">
          Visual guide: safe area, text zone and cropping
          {phone ? " (main and phone image)" : ""}
        </summary>
        {open ? (
          <div className="mt-4 flex flex-col gap-4">
            <ImageGuide spec={spec} />
            {phone ? <ImageGuide spec={phone} /> : null}
            <p className="text-xs text-muted">
              Drawn by:{" "}
              {[...spec.code, ...(phone?.code ?? [])]
                .filter((file, i, all) => all.indexOf(file) === i)
                .join(", ")}
            </p>
          </div>
        ) : null}
      </details>
    </li>
  );
}

export function GuidelinesBrowser({ usage }: { usage: UsageMap }) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<GroupKey | "all">("all");
  const [opened, setOpened] = useState<Set<string>>(new Set());

  // Links from upload fields land on #spec-id: open and show that entry.
  useEffect(() => {
    const show = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      if (!(id in IMAGE_SPECS)) return;
      const spec = IMAGE_SPECS[id as ImageSpecId];
      const main = spec.fallbackFor ?? spec.id;
      setQuery("");
      setGroup("all");
      setOpened((value) => new Set(value).add(main));
      requestAnimationFrame(() =>
        document.getElementById(id)?.scrollIntoView({ block: "start" }),
      );
    };
    show();
    window.addEventListener("hashchange", show);
    return () => window.removeEventListener("hashchange", show);
  }, []);

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const rows = useMemo(
    () =>
      ROWS.filter(
        (spec) =>
          (group === "all" || spec.group === group) &&
          terms.every((term) => haystack(spec).includes(term)),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [group, query],
  );
  const groups = (Object.keys(GROUPS) as GroupKey[]).filter((key) =>
    rows.some((spec) => spec.group === key),
  );

  return (
    <div className="mt-10">
      <div className="sticky top-16 z-20 -mx-(--gutter) border-b border-line bg-bg/95 px-(--gutter) py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search: hero, event, 4:5, phone, 1200…"
            aria-label="Search image placements"
            className="min-h-11 w-full max-w-sm rounded-(--radius) border border-line-strong bg-surface-1 px-3 text-base text-text placeholder:text-muted focus-visible:border-accent"
          />
          <div
            role="group"
            aria-label="Filter by website section"
            className="flex [scrollbar-width:none] gap-1 overflow-x-auto"
          >
            {(["all", ...Object.keys(GROUPS)] as (GroupKey | "all")[]).map(
              (key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={group === key}
                  onClick={() => setGroup(key)}
                  className={`inline-flex min-h-9 items-center rounded-full px-3 text-xs whitespace-nowrap transition-colors ${group === key ? "bg-accent text-accent-ink" : "text-muted hover:bg-surface-2 hover:text-text"}`}
                >
                  {key === "all" ? "All sections" : GROUPS[key].title}
                </button>
              ),
            )}
          </div>
        </div>
        <p aria-live="polite" className="mt-2 text-xs text-muted">
          {rows.length} of {ROWS.length} placements
        </p>
      </div>

      {groups.length ? (
        groups.map((key) => (
          <section key={key} aria-labelledby={`group-${key}`} className="mt-12">
            <h2 id={`group-${key}`} className="font-display text-3xl">
              {GROUPS[key].title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-muted">
              {GROUPS[key].body}
            </p>
            <ul className="mt-6 flex flex-col gap-4">
              {rows
                .filter((spec) => spec.group === key)
                .map((spec) => (
                  <SpecRow
                    key={spec.id}
                    spec={spec}
                    usage={usage}
                    open={opened.has(spec.id)}
                    onToggle={(open) =>
                      setOpened((value) => {
                        const next = new Set(value);
                        if (open) next.add(spec.id);
                        else next.delete(spec.id);
                        return next;
                      })
                    }
                  />
                ))}
            </ul>
          </section>
        ))
      ) : (
        <p className="mt-12 text-muted">
          No placement matches “{query}”. Try a page name or a ratio like 16:9.
        </p>
      )}
    </div>
  );
}
