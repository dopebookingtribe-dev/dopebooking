"use client";

import { useState } from "react";
import { Field } from "@/components/ui/field";
import { formatBytes, formatDuration } from "@/modules/media/constants";
import { LibraryUploader } from "@/modules/media/components/library-uploader";

export type VideoFileOption = {
  id: string;
  title: string;
  sizeBytes: number | null;
  durationSeconds: number | null;
};

/**
 * Choose where a video plays from: a pasted link or a file in the media
 * library (upload a new one here or pick an earlier upload).
 */
export function VideoSourceField({
  defaultSource = "link",
  defaultUrl = "",
  defaultFileId = "",
  files,
  urlError,
  fileError,
  filesEnabled,
}: {
  defaultSource?: "link" | "file";
  defaultUrl?: string;
  defaultFileId?: string;
  files: VideoFileOption[];
  urlError?: string;
  fileError?: string;
  /** False until the database update for uploaded videos is applied. */
  filesEnabled: boolean;
}) {
  const [source, setSource] = useState<"link" | "file">(
    filesEnabled ? defaultSource : "link",
  );
  const [fileId, setFileId] = useState(defaultFileId);
  const known = files.some((file) => file.id === fileId);

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="text-sm font-medium">Video source</legend>
      <input type="hidden" name="source" value={source} />
      <div className="flex flex-wrap gap-2" role="radiogroup">
        {(
          [
            ["link", "Link (YouTube, Vimeo, Mux, Cloudflare)"],
            ["file", "Uploaded file"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={source === value}
            disabled={value === "file" && !filesEnabled}
            onClick={() => setSource(value)}
            className={`min-h-11 rounded-full border px-4 text-sm transition-colors disabled:opacity-50 ${
              source === value
                ? "border-accent bg-accent/10 text-text"
                : "border-line-strong text-muted hover:text-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {!filesEnabled ? (
        <p className="text-xs text-muted">
          Uploaded videos become available once the database update for this
          release is applied.
        </p>
      ) : null}

      {source === "link" ? (
        <Field
          name="url"
          label="Video link"
          type="url"
          hint="Paste a YouTube, Vimeo, Mux or Cloudflare Stream link."
          defaultValue={defaultUrl}
          error={urlError}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <input type="hidden" name="file_asset_id" value={fileId} />
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium">Video file from the library</span>
            <select
              value={fileId}
              onChange={(event) => setFileId(event.target.value)}
              aria-invalid={fileError ? true : undefined}
              className="min-h-11 rounded-(--radius) border border-line-strong bg-surface-1 px-3 text-base aria-invalid:border-danger"
            >
              <option value="">Choose a video…</option>
              {fileId && !known ? (
                <option value={fileId}>Just uploaded</option>
              ) : null}
              {files.map((file) => (
                <option key={file.id} value={file.id}>
                  {file.title}
                  {file.durationSeconds
                    ? ` · ${formatDuration(file.durationSeconds)}`
                    : ""}
                  {file.sizeBytes ? ` · ${formatBytes(file.sizeBytes)}` : ""}
                </option>
              ))}
            </select>
            {fileError ? (
              <span className="text-sm text-danger">{fileError}</span>
            ) : null}
          </label>
          <LibraryUploader
            kinds={["video"]}
            multiple={false}
            label="Drop a new video file here"
            onUploaded={(ids) => ids[0] && setFileId(ids[0])}
          />
        </div>
      )}
    </fieldset>
  );
}
