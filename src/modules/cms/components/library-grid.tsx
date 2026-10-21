"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  deleteLibraryImage,
  updateImageDetails,
  type SaveResult,
} from "../actions";
import type { LibraryImage } from "../admin-queries";

function ImageItem({ image }: { image: LibraryImage }) {
  const [state, action, pending] = useActionState<SaveResult | null, FormData>(
    updateImageDetails.bind(null, image.id),
    null,
  );
  const [focal, setFocal] = useState({ x: image.focalX, y: image.focalY });
  const [deleting, startDelete] = useTransition();
  const [deleted, setDeleted] = useState<SaveResult | null>(null);

  if (deleted?.ok) return null;

  return (
    <li className="rounded-(--radius) border border-line bg-surface-1 p-4">
      <button
        type="button"
        aria-label="Set the focus point: click the most important part of the photo"
        onClick={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          setFocal({
            x: Math.round(((event.clientX - box.left) / box.width) * 100),
            y: Math.round(((event.clientY - box.top) / box.height) * 100),
          });
        }}
        className="relative block w-full cursor-crosshair overflow-hidden rounded-(--radius) bg-surface-2"
        style={{ aspectRatio: `${image.width} / ${image.height}` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.url}
          alt={image.alt}
          loading="lazy"
          className="size-full object-cover"
        />
        <span
          aria-hidden
          className="absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-bg/40"
          style={{ left: `${focal.x}%`, top: `${focal.y}%` }}
        />
        {image.isDemo ? (
          <span className="absolute top-2 left-2 rounded-full bg-bg/80 px-2 font-label text-xs text-uv">
            Demo
          </span>
        ) : null}
      </button>
      <div className="mt-3 grid grid-cols-3 gap-2" aria-hidden>
        {["aspect-[21/9]", "aspect-[4/3]", "aspect-[4/5]"].map((aspect) => (
          <span
            key={aspect}
            className={`relative block overflow-hidden rounded-sm bg-surface-2 ${aspect}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt=""
              className="size-full object-cover"
              style={{ objectPosition: `${focal.x}% ${focal.y}%` }}
            />
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">
        Click the photo to choose what stays in view when it is cropped. Crops
        shown above.
      </p>
      <form action={action} className="mt-4 flex flex-col gap-4" noValidate>
        <input type="hidden" name="focal_x" value={focal.x} />
        <input type="hidden" name="focal_y" value={focal.y} />
        <Field
          name="alt_text"
          label="Description (alt text)"
          defaultValue={image.alt}
          maxLength={300}
          required
        />
        <Field
          name="credit"
          label="Photo credit"
          defaultValue={image.credit ?? ""}
          maxLength={120}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
          <Button
            variant="ghost"
            disabled={deleting}
            onClick={() => {
              if (
                !window.confirm(
                  "Delete this photo? Sections using it will show no photo.",
                )
              )
                return;
              startDelete(async () =>
                setDeleted(await deleteLibraryImage(image.id)),
              );
            }}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
          {state ? (
            <p
              role={state.ok ? "status" : "alert"}
              className={`text-sm ${state.ok ? "text-success" : "text-danger"}`}
            >
              {state.message}
            </p>
          ) : null}
          {deleted && !deleted.ok ? (
            <p role="alert" className="text-sm text-danger">
              {deleted.message}
            </p>
          ) : null}
        </div>
      </form>
    </li>
  );
}

export function LibraryGrid({ images }: { images: LibraryImage[] }) {
  if (!images.length) {
    return (
      <p className="mt-10 text-muted">
        No photos yet. Upload the first ones above.
      </p>
    );
  }
  return (
    <ul className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {images.map((image) => (
        <ImageItem key={image.id} image={image} />
      ))}
    </ul>
  );
}
