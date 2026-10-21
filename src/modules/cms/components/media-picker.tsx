"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/modules/media/components/image-uploader";
import { registerLibraryImage } from "../actions";
import type { LibraryImage } from "../admin-queries";

export type PickRequest = {
  multiple: boolean;
  selected: string[];
  onPick: (ids: string[]) => void;
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

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (request && !dialog.open) {
      setSelected(request.selected);
      setQuery("");
      setUploading(false);
      dialog.showModal();
    }
    if (!request && dialog.open) dialog.close();
  }, [request]);

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
          <h2 className="font-display text-2xl">Media library</h2>
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
            <div className="max-w-2xl">
              <ImageUploader
                folder="library/site"
                multiple
                register={registerLibraryImage}
              />
              <p className="mt-4 text-sm text-muted">
                New photos appear in the library after uploading.
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
