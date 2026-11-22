"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import {
  formatBytes,
  MEDIA_KINDS,
  MEDIA_KIND_LIST,
  titleFromFileName,
  type MediaKind,
} from "../constants";
import { GUIDELINES_PATH } from "../image-specs";
import {
  registerLibraryFile,
  replaceLibraryFile,
  type LibraryResult,
} from "../library-actions";
import {
  libraryPath,
  probeFile,
  removeUpload,
  uploadWithProgress,
} from "../upload-client";

type Item = {
  key: string;
  name: string;
  size: number;
  kind: MediaKind | null;
  stage: "checking" | "uploading" | "saving" | "done" | "error";
  progress: number;
  message?: string;
  id?: string;
};

/** Formats, size caps and where each kind is used, shown before uploading. */
export function UploadRules({ kinds }: { kinds: MediaKind[] }) {
  return (
    <ul className="grid gap-2 text-sm sm:grid-cols-2">
      {kinds.map((kind) => {
        const rule = MEDIA_KINDS[kind];
        return (
          <li key={kind} className="rounded-lg border border-line px-3 py-2">
            <span className="font-medium">{rule.plural}</span>
            <span className="block font-label text-xs text-muted">
              {rule.formats} · up to {formatBytes(rule.maxBytes)}
            </span>
            <span className="mt-1 block text-xs text-muted">
              {rule.use}
              {kind === "image" ? (
                <>
                  {" "}
                  Recommended sizes per placement:{" "}
                  <Link
                    href={GUIDELINES_PATH}
                    className="underline underline-offset-2"
                  >
                    image guidelines
                  </Link>
                  .
                </>
              ) : kind === "video" ? (
                " Recommended 1920 × 1080 (16:9), H.264 MP4 for every browser."
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Drag-and-drop uploader for the media library. Checks type and size before
 * uploading, shows progress per file, then records each file on the server
 * (which checks again). With `replaceId`, it swaps the file behind one item.
 */
export function LibraryUploader({
  kinds = MEDIA_KIND_LIST,
  replaceId,
  multiple = true,
  onUploaded,
  showRules = true,
  label,
}: {
  kinds?: MediaKind[];
  replaceId?: string;
  multiple?: boolean;
  onUploaded?: (ids: string[]) => void;
  showRules?: boolean;
  label?: string;
}) {
  const router = useRouter();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const many = multiple && !replaceId;
  const accept = kinds
    .flatMap((kind) => [
      ...MEDIA_KINDS[kind].types,
      ...Object.keys(MEDIA_KINDS[kind].extensions).map((e) => `.${e}`),
    ])
    .join(",");

  const update = (key: string, patch: Partial<Item>) =>
    setItems((list) =>
      list.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );

  async function handle(files: File[]) {
    if (!files.length || busy) return;
    const chosen = many ? files : files.slice(0, 1);
    const fresh: Item[] = chosen.map((file) => ({
      key: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      kind: null,
      stage: "checking",
      progress: 0,
    }));
    setItems((list) => [...fresh, ...list.filter((i) => i.stage !== "done")]);
    setBusy(true);
    const ids: string[] = [];

    // One at a time keeps progress readable and the connection steady.
    for (const [index, file] of chosen.entries()) {
      const key = fresh[index].key;
      let path = "";
      let bucket = "";
      try {
        const probed = await probeFile(file, kinds);
        const rule = MEDIA_KINDS[probed.kind];
        update(key, { kind: probed.kind, stage: "uploading" });
        path = libraryPath(probed.kind, probed.mime);
        bucket = rule.bucket;
        await uploadWithProgress(bucket, path, file, probed.mime, (fraction) =>
          update(key, { progress: fraction }),
        );
        update(key, { stage: "saving", progress: 1 });
        const details = {
          path,
          kind: probed.kind,
          original_name: file.name.slice(0, 200),
          width: probed.width,
          height: probed.height,
          duration_seconds: probed.durationSeconds,
        };
        const result: LibraryResult = replaceId
          ? await replaceLibraryFile(replaceId, details)
          : await registerLibraryFile({
              ...details,
              alt_text: titleFromFileName(file.name),
            });
        if (!result.ok) {
          path = "";
          throw new Error(result.message);
        }
        ids.push(result.id);
        update(key, { stage: "done", id: result.id, message: result.message });
      } catch (error) {
        if (path) await removeUpload(bucket, path).catch(() => undefined);
        update(key, {
          stage: "error",
          message: error instanceof Error ? error.message : "Upload failed.",
        });
      }
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    if (ids.length) {
      onUploaded?.(ids);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {showRules ? <UploadRules kinds={kinds} /> : null}
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node))
            setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void handle([...event.dataTransfer.files]);
        }}
        className={`flex flex-col items-center justify-center gap-3 rounded-(--radius) border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragging
            ? "border-accent bg-accent/5"
            : "border-line-strong bg-surface-1"
        }`}
      >
        <p className="font-display text-2xl">
          {label ?? (replaceId ? "Drop the new file here" : "Drop files here")}
        </p>
        <p className="text-sm text-muted">
          or{" "}
          <label
            htmlFor={inputId}
            className="cursor-pointer text-text underline underline-offset-4 hover:text-accent"
          >
            choose {many ? "files" : "a file"}
          </label>{" "}
          from your device
        </p>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          multiple={many}
          disabled={busy}
          className="sr-only"
          onChange={(event) => void handle([...(event.target.files ?? [])])}
        />
      </div>

      {items.length ? (
        <ul className="flex flex-col gap-2" aria-live="polite">
          {items.map((item) => (
            <li
              key={item.key}
              className="rounded-lg border border-line px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0 truncate font-medium">
                  {item.name}
                </span>
                <span
                  className={`font-label text-xs ${
                    item.stage === "error"
                      ? "text-danger"
                      : item.stage === "done"
                        ? "text-success"
                        : "text-muted"
                  }`}
                >
                  {item.stage === "checking"
                    ? "Checking…"
                    : item.stage === "uploading"
                      ? `Uploading ${Math.round(item.progress * 100)}%`
                      : item.stage === "saving"
                        ? "Saving…"
                        : item.stage === "done"
                          ? replaceId
                            ? "Replaced"
                            : "Uploaded"
                          : "Failed"}
                  {item.kind ? ` · ${MEDIA_KINDS[item.kind].label}` : ""} ·{" "}
                  {formatBytes(item.size)}
                </span>
              </div>
              {item.stage === "uploading" || item.stage === "saving" ? (
                <div
                  role="progressbar"
                  aria-label={`Uploading ${item.name}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(item.progress * 100)}
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2"
                >
                  <div
                    className="h-full rounded-full bg-accent transition-[width]"
                    style={{ width: `${Math.round(item.progress * 100)}%` }}
                  />
                </div>
              ) : null}
              {item.message ? (
                <p
                  role={item.stage === "error" ? "alert" : undefined}
                  className={`mt-1 text-xs ${item.stage === "error" ? "text-danger" : "text-muted"}`}
                >
                  {item.message}
                </p>
              ) : null}
              {item.stage === "done" && item.id && !replaceId ? (
                <Link
                  href={`/admin/media/${item.id}`}
                  className="mt-1 inline-block text-xs underline underline-offset-2"
                >
                  Add a description and credit
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
