"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { MediaKind } from "../constants";
import {
  deleteLibraryFile,
  updateLibraryFile,
  type DetailsResult,
} from "../library-actions";

/** Title/description, credit and (for images) the focus point. */
export function MediaDetailsForm({
  id,
  kind,
  url,
  alt,
  credit,
  focalX,
  focalY,
  width,
  height,
  editable,
}: {
  id: string;
  kind: MediaKind;
  url: string;
  alt: string;
  credit: string | null;
  focalX: number;
  focalY: number;
  width: number | null;
  height: number | null;
  editable: boolean;
}) {
  const [state, action, pending] = useActionState<DetailsResult, FormData>(
    updateLibraryFile.bind(null, id),
    null,
  );
  const [focal, setFocal] = useState({ x: focalX, y: focalY });

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {kind === "image" ? (
        <div>
          <p className="text-sm font-medium">Focus point</p>
          <p className="mt-1 text-xs text-muted">
            Click the most important part of the photo. It stays in view when
            the photo is cropped (previews below).
          </p>
          <button
            type="button"
            disabled={!editable}
            aria-label="Set the focus point"
            onClick={(event) => {
              const box = event.currentTarget.getBoundingClientRect();
              setFocal({
                x: Math.round(((event.clientX - box.left) / box.width) * 100),
                y: Math.round(((event.clientY - box.top) / box.height) * 100),
              });
            }}
            className="relative mt-3 block w-full max-w-md cursor-crosshair overflow-hidden rounded-lg bg-surface-2 disabled:cursor-default"
            style={{ aspectRatio: `${width ?? 4} / ${height ?? 3}` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="size-full object-cover" />
            <span
              aria-hidden
              className="absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-bg/40"
              style={{ left: `${focal.x}%`, top: `${focal.y}%` }}
            />
          </button>
          <div className="mt-3 grid max-w-md grid-cols-3 gap-2" aria-hidden>
            {["aspect-[21/9]", "aspect-[4/3]", "aspect-[4/5]"].map((aspect) => (
              <span
                key={aspect}
                className={`relative block overflow-hidden rounded-sm bg-surface-2 ${aspect}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className="size-full object-cover"
                  style={{ objectPosition: `${focal.x}% ${focal.y}%` }}
                />
              </span>
            ))}
          </div>
          <input type="hidden" name="focal_x" value={focal.x} />
          <input type="hidden" name="focal_y" value={focal.y} />
        </div>
      ) : null}
      <Field
        name="alt_text"
        label={kind === "image" ? "Description (alt text)" : "Title"}
        hint={
          kind === "image"
            ? "Read aloud by screen readers. Describe what the photo shows."
            : "Shown in pickers and next to players and download links."
        }
        defaultValue={alt}
        maxLength={300}
        required
        disabled={!editable}
      />
      <Field
        name="credit"
        label={kind === "image" ? "Photo credit" : "Credit"}
        defaultValue={credit ?? ""}
        maxLength={120}
        disabled={!editable}
      />
      {editable ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save details"}
          </Button>
          {state ? (
            <p
              role={state.ok ? "status" : "alert"}
              className={`text-sm ${state.ok ? "text-success" : "text-danger"}`}
            >
              {state.message}
            </p>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

export function CopyButton({
  value,
  label = "Copy link",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt("Copy this link:", value);
        }
      }}
    >
      {copied ? "Copied" : label}
    </Button>
  );
}

/** Delete with confirmation; the server refuses while the file is in use. */
export function DeleteFileButton({ id, used }: { id: string; used: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<DetailsResult>(null);
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        disabled={pending || used}
        className="self-start border-danger/60! text-danger! hover:border-danger!"
        onClick={() => {
          if (
            !window.confirm(
              "Delete this file permanently? This can't be undone.",
            )
          )
            return;
          start(async () => {
            const outcome = await deleteLibraryFile(id);
            setResult(outcome);
            if (outcome?.ok) router.push("/admin/media?deleted=1");
          });
        }}
      >
        {pending ? "Deleting…" : "Delete file"}
      </Button>
      {used ? (
        <p className="text-xs text-muted">
          In use, so it can&apos;t be deleted. Remove it from the places listed
          above first, or replace the file instead.
        </p>
      ) : null}
      {result && !result.ok ? (
        <p role="alert" className="text-sm text-danger">
          {result.message}
        </p>
      ) : null}
    </div>
  );
}
