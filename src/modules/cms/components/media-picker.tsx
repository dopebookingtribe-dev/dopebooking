"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/modules/media/components/image-uploader";
import { fitBadge } from "@/modules/media/image-check";
import {
  GUIDELINES_PATH,
  IMAGE_SPECS,
  ratioLabel,
  sizeLabel,
  type ImageSpecId,
} from "@/modules/media/image-specs";
import { registerLibraryImage } from "../actions";
import type { LibraryImage } from "../admin-queries";

export type PickRequest = {
  multiple: boolean;
  selected: string[];
  onPick: (ids: string[]) => void;
  /** The placement being filled: size badges and upload checks follow it. */
  spec?: ImageSpecId;
};

/** Modal grid of library photos, with an upload form for new ones. */
export function MediaPicker({
  request,
  library,
  onClose,
}: {
  request: PickRequest | null;
  library: LibraryImage[];
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  // A fresh upload for a single photo field, used as soon as the refreshed
  // library includes it.
  const [waitingFor, setWaitingFor] = useState<string | null>(null);
  const spec = request?.spec ? IMAGE_SPECS[request.spec] : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (request && !dialog.open) {
      setSelected(request.selected);
      setQuery("");
      setUploading(false);
      setWaitingFor(null);
      dialog.showModal();
    }
    if (!request && dialog.open) dialog.close();
  }, [request]);

  useEffect(() => {
    if (!waitingFor || !request) return;
    if (!library.some((image) => image.id === waitingFor)) return;
    request.onPick([waitingFor]);
    onClose();
  }, [waitingFor, library, request, onClose]);

  const toggle = (id: string) => {
    if (!request) return;
    if (!request.multiple) {
      request.onPick([id]);
      onClose();
      return;
    }
    setSelected((value) =>
      value.includes(id) ? value.filter((item) => item !== id) : [...value, id],
    );
  };

  const shown = query
    ? library.filter((image) =>
        `${image.alt} ${image.credit ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      )
    : library;

  return (
    <dialog
      ref={dialogRef}
      aria-label="Choose photos"
      onClose={onClose}
      className="m-auto h-[min(90dvh,56rem)] w-[min(96vw,72rem)] max-w-none rounded-(--radius) border border-line bg-surface-1 p-0 text-text backdrop:bg-bg/80 backdrop:backdrop-blur-sm"
    >
      <div className="flex h-full flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-2xl">Media library</h2>
            {spec ? (
              <p className="mt-1 text-sm text-muted">
                For {spec.title.toLowerCase()}:{" "}
                <span className="text-accent">
                  {sizeLabel(spec.size)}
                  {spec.anyRatio ? "" : ` (${ratioLabel(...spec.size)})`}
                </span>
                , at least {sizeLabel(spec.min)}.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              placeholder="Search descriptions"
              aria-label="Search photos"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-h-11 rounded-(--radius) border border-line-strong bg-bg px-3 text-sm"
            />
            <Button
              variant="secondary"
              onClick={() => setUploading((value) => !value)}
            >
              {uploading ? "Back to library" : "Upload new"}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {uploading ? (
            <div className="max-w-3xl">
              <ImageUploader
                folder="library/site"
                multiple={request?.multiple ?? true}
                register={registerLibraryImage}
                roles={request?.spec ? [{ spec: request.spec }] : []}
                guidelinesHref={GUIDELINES_PATH}
                onUploaded={(ids) => {
                  if (!ids.length || !request) return;
                  setUploading(false);
                  if (request.multiple) {
                    setSelected((value) => [
                      ...value,
                      ...ids.filter((id) => !value.includes(id)),
                    ]);
                  } else {
                    setWaitingFor(ids[0]);
                  }
                }}
              />
              <p className="mt-4 text-sm text-muted">
                {request?.multiple
                  ? "New photos are added to your selection after uploading."
                  : "The new photo is used here as soon as it has uploaded."}
              </p>
            </div>
          ) : shown.length ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {shown.map((image) => {
                const position = selected.indexOf(image.id);
                const active = position >= 0;
                return (
                  <li key={image.id}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggle(image.id)}
                      className={`group relative block aspect-[4/3] w-full overflow-hidden rounded-(--radius) bg-surface-2 outline-offset-2 ${active ? "outline-2 outline-accent" : ""}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.url}
                        alt={image.alt}
                        loading="lazy"
                        className="size-full object-cover transition-opacity group-hover:opacity-80"
                        style={{
                          objectPosition: `${image.focalX}% ${image.focalY}%`,
                        }}
                      />
                      {active && request?.multiple ? (
                        <span className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-accent font-label text-sm text-accent-ink">
                          {position + 1}
                        </span>
                      ) : null}
                      {image.isDemo ? (
                        <span className="absolute bottom-2 left-2 rounded-full bg-bg/80 px-2 font-label text-xs text-uv">
                          Demo
                        </span>
                      ) : null}
                    </button>
                    <p className="mt-1 truncate text-xs text-muted">
                      {image.alt}
                    </p>
                    <p className="flex flex-wrap gap-x-2 font-label text-[11px] text-muted">
                      <span>
                        {image.width} × {image.height}
                      </span>
                      {spec
                        ? (() => {
                            const badge = fitBadge(
                              spec,
                              image.width,
                              image.height,
                            );
                            return (
                              <span
                                className={
                                  badge.level === "warn"
                                    ? "text-accent"
                                    : "text-success"
                                }
                              >
                                {badge.level === "warn" ? "!" : "✓"}{" "}
                                {badge.label}
                              </span>
                            );
                          })()
                        : null}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-muted">
              {library.length
                ? "No photos match your search."
                : "The library is empty. Upload the first photos."}
            </p>
          )}
        </div>

        {waitingFor ? (
          <p
            role="status"
            className="border-t border-line px-5 py-3 text-sm text-muted"
          >
            Adding the new photo…
          </p>
        ) : null}

        {request?.multiple && !uploading ? (
          <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4">
            <p className="text-sm text-muted">
              {selected.length} selected. Order follows your clicks.
            </p>
            <Button
              onClick={() => {
                request.onPick(selected);
                onClose();
              }}
            >
              Use these photos
            </Button>
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
