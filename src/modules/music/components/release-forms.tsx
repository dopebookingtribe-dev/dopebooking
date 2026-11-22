"use client";

import { useRouter } from "next/navigation";
import { useActionState, useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, SelectField, TextareaField } from "@/components/ui/field";
import { fieldError, fieldValue } from "@/components/ui/form-helpers";
import { FormStatus } from "@/components/ui/form-status";
import { initialFormState, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/client";
import type {
  ArtistPayoutDetailsRow,
  MusicFileFormat,
  MusicReleaseRow,
  MusicReleaseStatus,
} from "@/lib/supabase/database.types";
import { centsToInput, formatCents } from "@/modules/marketplace/schemas";
import {
  cancelWithdrawal,
  createTrack,
  deleteRelease,
  deleteTrack,
  deleteTrackFile,
  moveTrack,
  registerTrackFile,
  registerTrackPreview,
  returnToDraft,
  saveBundleItems,
  unpublishRelease,
} from "../actions";
import { makePreview, titleFromFileName } from "../preview-audio";
import type { Genre } from "../queries";
import {
  FILE_FORMATS,
  formatDuration,
  formatOfFile,
  MAX_MASTER_BYTES,
  MUSICAL_KEYS,
  RELEASE_TYPES,
} from "../schemas";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;
type Result = { ok: true } | { ok: false; message: string };

const ACCEPT_AUDIO = ".wav,.flac,.mp3,.aif,.aiff,audio/*";
const fileInputClass =
  "text-sm file:mr-4 file:min-h-11 file:cursor-pointer file:rounded-(--radius) file:border file:border-line-strong file:bg-surface-1 file:px-4 file:text-text disabled:opacity-50";

/** Runs a server action that returns a Result, then refreshes the page. */
function useResultAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const run = (action: () => Promise<Result | void>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    startTransition(async () => {
      setError(undefined);
      const result = await action();
      if (result && !result.ok) setError(result.message);
      else router.refresh();
    });
  };
  return { pending, error, run };
}

function ErrorText({ error }: { error?: string }) {
  return error ? (
    <p role="alert" className="text-sm text-danger">
      {error}
    </p>
  ) : null;
}

// ---------------------------------------------------------------------------
// Create and details
// ---------------------------------------------------------------------------

export function CreateReleaseForm({
  artists,
  action,
}: {
  artists: { id: string; name: string }[];
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form
      action={formAction}
      className="flex max-w-xl flex-col gap-6"
      noValidate
    >
      {artists.length > 1 ? (
        <SelectField
          name="artist_id"
          label="Artist"
          defaultValue={fieldValue(state, "artist_id", artists[0]?.id)}
        >
          {artists.map((artist) => (
            <option key={artist.id} value={artist.id}>
              {artist.name}
            </option>
          ))}
        </SelectField>
      ) : (
        <input type="hidden" name="artist_id" value={artists[0]?.id ?? ""} />
      )}
      <Field
        name="title"
        label="Title"
        required
        defaultValue={fieldValue(state, "title", null)}
        error={fieldError(state, "title")}
      />
      <fieldset>
        <legend className="text-sm font-medium">What are you releasing?</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {Object.entries(RELEASE_TYPES).map(([key, label]) => (
            <label
              key={key}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-(--radius) border border-line-strong px-4 has-checked:border-accent has-checked:bg-accent/10"
            >
              <input
                type="radio"
                name="release_type"
                value={key}
                defaultChecked={
                  fieldValue(state, "release_type", "track") === key
                }
                className="accent-(--accent)"
              />
              <span>
                {label}
                <span className="block text-xs text-muted">
                  {key === "track"
                    ? "One track"
                    : key === "ep"
                      ? "A few tracks"
                      : key === "album"
                        ? "A full record"
                        : "Several of your releases at a better price"}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <FormStatus state={state} />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Creating…" : "Create draft"}
      </Button>
    </form>
  );
}

export function ReleaseDetailsForm({
  release,
  genres,
  live,
  action,
}: {
  release: MusicReleaseRow;
  genres: Genre[];
  /** Live releases only change price, availability and text. */
  live: boolean;
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const value = (name: keyof MusicReleaseRow) =>
    fieldValue(state, name, release[name]);
  const error = (name: string) => fieldError(state, name);
  const [genreId, setGenreId] = useState(value("genre_id"));
  const parents = genres.filter((genre) => !genre.parentId);
  const styles = genres.filter((genre) => genre.parentId === genreId);
  const price = fieldValue(
    state,
    "price_amount",
    release.price_amount === null ? null : centsToInput(release.price_amount),
  );

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {live ? (
        <p className="rounded-(--radius) border border-line bg-surface-1 p-4 text-sm text-muted">
          This release is live. You can change the price, availability and texts
          here. To change the title, artwork, genre or tracks, unpublish it
          first; it then needs a new review.
        </p>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field
              name="title"
              label="Title"
              required
              defaultValue={value("title")}
              error={error("title")}
            />
            <Field
              name="slug"
              label="URL name"
              hint="Letters, numbers and dashes."
              required
              defaultValue={value("slug")}
              error={error("slug")}
            />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <SelectField
              name="genre_id"
              label="Genre"
              value={genreId}
              onChange={(event) => setGenreId(event.target.value)}
              error={error("genre_id")}
            >
              <option value="">Choose…</option>
              {parents.map((genre) => (
                <option key={genre.id} value={genre.id}>
                  {genre.name}
                </option>
              ))}
            </SelectField>
            <SelectField
              key={genreId}
              name="subgenre_id"
              label="Style"
              defaultValue={
                styles.some((style) => style.id === value("subgenre_id"))
                  ? value("subgenre_id")
                  : ""
              }
              error={error("subgenre_id")}
              disabled={!styles.length}
            >
              <option value="">{styles.length ? "Choose…" : "—"}</option>
              {styles.map((genre) => (
                <option key={genre.id} value={genre.id}>
                  {genre.name}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            <Field
              name="bpm"
              label="BPM"
              inputMode="numeric"
              placeholder="145"
              defaultValue={value("bpm")}
              error={error("bpm")}
            />
            <SelectField
              name="musical_key"
              label="Key"
              defaultValue={value("musical_key")}
              error={error("musical_key")}
            >
              <option value="">—</option>
              {MUSICAL_KEYS.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </SelectField>
            <Field
              name="release_date"
              label="Release date"
              type="date"
              defaultValue={value("release_date")}
              error={error("release_date")}
            />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field
              name="label"
              label="Label"
              hint="Leave empty for self-released."
              defaultValue={value("label")}
              error={error("label")}
            />
            <Field
              name="catalog_number"
              label="Catalogue number"
              defaultValue={value("catalog_number")}
              error={error("catalog_number")}
            />
          </div>
        </>
      )}
      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          name="price_amount"
          label="Price (EUR)"
          inputMode="decimal"
          placeholder="1.99"
          required
          hint="From €0.50. Buyers pay this; you get it minus our commission."
          defaultValue={price}
          error={error("price_amount")}
        />
        <label className="flex min-h-11 items-center gap-3 self-end pb-2 text-sm">
          <input
            type="checkbox"
            name="on_sale"
            defaultChecked={
              state.values ? state.values.on_sale === "on" : release.on_sale
            }
            className="size-5 accent-(--accent)"
          />
          For sale (untick to show it without selling)
        </label>
      </div>
      <TextareaField
        name="description"
        label="About this release"
        rows={6}
        hint="The story, the mood, where it was made."
        defaultValue={value("description")}
        error={error("description")}
      />
      <TextareaField
        name="credits"
        label="Credits"
        rows={4}
        hint="Written and produced by…, mastered by…, artwork by…"
        defaultValue={value("credits")}
        error={error("credits")}
      />
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save details"}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Tracks: upload masters, make previews
// ---------------------------------------------------------------------------

function contentTypeFor(file: File, format: MusicFileFormat) {
  return FILE_FORMATS[format].mime.includes(file.type)
    ? file.type
    : FILE_FORMATS[format].mime[0];
}

async function uploadMaster(
  releaseId: string,
  trackId: string,
  file: File,
): Promise<Result> {
  const format = formatOfFile(file);
  if (!format)
    return { ok: false, message: `${file.name}: use WAV, FLAC, MP3 or AIFF.` };
  if (file.size > MAX_MASTER_BYTES) {
    return {
      ok: false,
      message: `${file.name} is over 50 MB. Export it as FLAC (lossless, about half the size).`,
    };
  }
  const path = `releases/${releaseId}/${trackId}/${crypto.randomUUID()}.${FILE_FORMATS[format].extension}`;
  const supabase = createClient();
  const { error } = await supabase.storage
    .from("music-masters")
    .upload(path, file, {
      contentType: contentTypeFor(file, format),
      upsert: false,
    });
  if (error)
    return {
      ok: false,
      message: `${file.name}: upload failed. Please try again.`,
    };
  const result = await registerTrackFile(trackId, { path });
  if (!result.ok) await supabase.storage.from("music-masters").remove([path]);
  return result;
}

async function uploadPreview(
  releaseId: string,
  trackId: string,
  blob: Blob,
  duration: number | null,
  extension = "wav",
): Promise<Result> {
  const path = `releases/${releaseId}/${trackId}/preview-${crypto.randomUUID()}.${extension}`;
  const supabase = createClient();
  const { error } = await supabase.storage
    .from("music-previews")
    .upload(path, blob, {
      contentType: blob.type || "audio/wav",
      cacheControl: "31536000",
      upsert: false,
    });
  if (error) return { ok: false, message: "Preview upload failed." };
  const result = await registerTrackPreview(trackId, { path, duration });
  if (!result.ok) await supabase.storage.from("music-previews").remove([path]);
  return result;
}

/** Drop in masters: each becomes a track with a public 60-second preview. */
export function TrackUploader({ releaseId }: { releaseId: string }) {
  const router = useRouter();
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<{ error: boolean; text: string }[]>([]);

  async function handle(files: File[]) {
    setBusy(true);
    setLog([]);
    const say = (error: boolean, text: string) =>
      setLog((lines) => [...lines, { error, text }]);
    for (const file of files) {
      if (!formatOfFile(file)) {
        say(true, `${file.name}: use WAV, FLAC, MP3 or AIFF.`);
        continue;
      }
      say(false, `${file.name}: making the preview…`);
      let preview: Awaited<ReturnType<typeof makePreview>> | null = null;
      try {
        preview = await makePreview(file);
      } catch {
        preview = null;
      }
      const created = await createTrack(releaseId, {
        title: titleFromFileName(file.name),
        duration: preview?.duration ?? null,
      });
      if (!created.ok) {
        say(true, `${file.name}: ${created.message}`);
        continue;
      }
      say(false, `${file.name}: uploading (large files take a minute)…`);
      const master = await uploadMaster(releaseId, created.trackId, file);
      if (!master.ok) {
        say(true, master.message);
        continue;
      }
      if (preview) {
        const clip = await uploadPreview(
          releaseId,
          created.trackId,
          preview.blob,
          preview.duration,
        );
        say(
          !clip.ok,
          clip.ok ? `${file.name}: done.` : `${file.name}: ${clip.message}`,
        );
      } else {
        say(
          true,
          `${file.name}: uploaded, but this browser couldn't read it to make a preview. Add a preview MP3 to the track below.`,
        );
      }
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-(--radius) border border-dashed border-line-strong p-5">
      <label htmlFor={inputId} className="font-medium">
        Add tracks
      </label>
      <input
        id={inputId}
        type="file"
        accept={ACCEPT_AUDIO}
        multiple
        disabled={busy}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length)
            void handle(files).finally(() => (event.target.value = ""));
        }}
        className={fileInputClass}
      />
      <p className="text-sm text-muted">
        WAV, FLAC, MP3 or AIFF, up to 50 MB each. Masters stay private: only
        buyers can download them. We make a 60-second preview in your browser
        for the store.
      </p>
      {log.length ? (
        <ul aria-live="polite" className="flex flex-col gap-1 text-sm">
          {log.map((line, index) => (
            <li
              key={index}
              className={line.error ? "text-danger" : "text-muted"}
            >
              {line.text}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export type EditableTrack = {
  id: string;
  position: number;
  title: string;
  duration_seconds: number | null;
  bpm: number | null;
  musical_key: string | null;
  isrc: string | null;
  previewUrl: string | null;
  files: { id: string; format: MusicFileFormat; size_bytes: number }[];
};

export function TrackRows({
  releaseId,
  tracks,
  editable,
  updateActions,
}: {
  releaseId: string;
  tracks: EditableTrack[];
  editable: boolean;
  /** updateTrack bound to each track id. */
  updateActions: Record<string, Action>;
}) {
  if (!tracks.length)
    return <p className="text-sm text-muted">No tracks yet.</p>;
  return (
    <ol className="flex flex-col gap-4">
      {tracks.map((track, index) => (
        <TrackRow
          key={track.id}
          releaseId={releaseId}
          track={track}
          first={index === 0}
          last={index === tracks.length - 1}
          editable={editable}
          update={updateActions[track.id]}
        />
      ))}
    </ol>
  );
}

function TrackRow({
  releaseId,
  track,
  first,
  last,
  editable,
  update,
}: {
  releaseId: string;
  track: EditableTrack;
  first: boolean;
  last: boolean;
  editable: boolean;
  update: Action;
}) {
  const { pending, error, run } = useResultAction();
  const [state, formAction, saving] = useActionState(update, initialFormState);
  const [open, setOpen] = useState(false);
  const formatId = useId();
  const previewId = useId();
  const missing = !track.files.length || !track.previewUrl;

  return (
    <li
      className="rounded-(--radius) border border-line bg-surface-1 p-4"
      aria-busy={pending}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-label text-sm text-muted tabular-nums">
          {String(track.position).padStart(2, "0")}
        </span>
        <p className="min-w-0 flex-1 truncate font-medium">{track.title}</p>
        <span className="font-label text-xs text-muted">
          {[
            formatDuration(track.duration_seconds),
            ...track.files.map((file) => FILE_FORMATS[file.format].label),
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
        {missing ? (
          <span className="rounded-full border border-danger/60 px-2 py-0.5 font-label text-xs text-danger">
            {track.files.length ? "Needs preview" : "Needs audio"}
          </span>
        ) : null}
        {editable ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={first || pending}
              onClick={() => run(() => moveTrack(track.id, -1))}
              aria-label={`Move ${track.title} up`}
              className="inline-flex size-11 items-center justify-center rounded-full text-muted hover:text-text disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={last || pending}
              onClick={() => run(() => moveTrack(track.id, 1))}
              aria-label={`Move ${track.title} down`}
              className="inline-flex size-11 items-center justify-center rounded-full text-muted hover:text-text disabled:opacity-30"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              className="min-h-11 px-3 text-sm text-muted underline-offset-4 hover:text-text hover:underline"
            >
              {open ? "Close" : "Edit"}
            </button>
          </div>
        ) : null}
      </div>
      {track.previewUrl ? (
        <audio
          controls
          preload="none"
          src={track.previewUrl}
          className="mt-3 h-9 w-full max-w-md"
          aria-label={`Preview of ${track.title}`}
        />
      ) : null}
      <ErrorText error={error} />
      {open && editable ? (
        <div className="mt-5 flex flex-col gap-6 border-t border-line pt-5">
          <form
            action={formAction}
            className="grid gap-4 sm:grid-cols-2"
            noValidate
          >
            <Field
              name="title"
              label="Track title"
              required
              defaultValue={fieldValue(state, "title", track.title)}
              error={fieldError(state, "title")}
              className="sm:col-span-2"
            />
            <Field
              name="bpm"
              label="BPM"
              inputMode="numeric"
              defaultValue={fieldValue(state, "bpm", track.bpm)}
              error={fieldError(state, "bpm")}
            />
            <SelectField
              name="musical_key"
              label="Key"
              defaultValue={fieldValue(state, "musical_key", track.musical_key)}
              error={fieldError(state, "musical_key")}
            >
              <option value="">—</option>
              {MUSICAL_KEYS.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </SelectField>
            <Field
              name="isrc"
              label="ISRC"
              hint="Optional, e.g. DEABC2600001."
              defaultValue={fieldValue(state, "isrc", track.isrc)}
              error={fieldError(state, "isrc")}
            />
            <div className="flex items-end gap-4 sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save track"}
              </Button>
              <FormStatus state={state} />
            </div>
          </form>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Files</p>
            <ul className="flex flex-wrap gap-2">
              {track.files.map((file) => (
                <li
                  key={file.id}
                  className="inline-flex items-center gap-2 rounded-full border border-line-strong py-1 pr-1 pl-3 text-sm"
                >
                  {FILE_FORMATS[file.format].label}
                  <span className="text-muted">
                    {(file.size_bytes / 1024 / 1024).toFixed(1)} MB
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      run(
                        () => deleteTrackFile(file.id),
                        `Remove the ${FILE_FORMATS[file.format].label} file?`,
                      )
                    }
                    className="inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-danger"
                    aria-label={`Remove ${FILE_FORMATS[file.format].label} file`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <label htmlFor={formatId} className="mt-2 text-sm text-muted">
              Add another format (e.g. MP3 next to your WAV)
            </label>
            <input
              id={formatId}
              type="file"
              accept={ACCEPT_AUDIO}
              disabled={pending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) run(() => uploadMaster(releaseId, track.id, file));
              }}
              className={fileInputClass}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor={previewId} className="text-sm font-medium">
              Replace the preview
            </label>
            <input
              id={previewId}
              type="file"
              accept=".mp3,.wav,audio/mpeg,audio/wav"
              disabled={pending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                if (file.size > 15 * 1024 * 1024) {
                  window.alert(
                    "Previews must be under 15 MB. A 60-second MP3 is ideal.",
                  );
                  return;
                }
                const mp3 =
                  /\.mp3$/i.test(file.name) || file.type === "audio/mpeg";
                run(() =>
                  uploadPreview(
                    releaseId,
                    track.id,
                    file.slice(0, file.size, mp3 ? "audio/mpeg" : "audio/wav"),
                    null,
                    mp3 ? "mp3" : "wav",
                  ),
                );
              }}
              className={fileInputClass}
            />
            <p className="text-xs text-muted">
              A short MP3 or WAV clip, not the full track: previews are public.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              run(
                () => deleteTrack(track.id),
                `Delete "${track.title}" and its files?`,
              )
            }
            className="self-start text-sm text-danger underline-offset-4 hover:underline"
          >
            Delete track
          </button>
        </div>
      ) : null}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Bundles, submit, status
// ---------------------------------------------------------------------------

export function BundlePicker({
  releaseId,
  candidates,
  selected,
  editable,
}: {
  releaseId: string;
  candidates: {
    id: string;
    title: string;
    release_type: string;
    status: MusicReleaseStatus;
  }[];
  selected: string[];
  editable: boolean;
}) {
  const [chosen, setChosen] = useState<string[]>(selected);
  const { pending, error, run } = useResultAction();
  const [saved, setSaved] = useState(false);
  if (!candidates.length) {
    return (
      <p className="text-sm text-muted">
        Create your other releases first; a bundle sells several of them
        together.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {candidates.map((candidate) => (
          <li key={candidate.id}>
            <label className="flex min-h-11 items-center gap-3 rounded-(--radius) border border-line px-4 has-checked:border-accent">
              <input
                type="checkbox"
                disabled={!editable}
                checked={chosen.includes(candidate.id)}
                onChange={(event) => {
                  setSaved(false);
                  setChosen(
                    event.target.checked
                      ? [...chosen, candidate.id]
                      : chosen.filter((id) => id !== candidate.id),
                  );
                }}
                className="size-5 accent-(--accent)"
              />
              <span className="flex-1">{candidate.title}</span>
              <span className="font-label text-xs text-muted">
                {
                  RELEASE_TYPES[
                    candidate.release_type as keyof typeof RELEASE_TYPES
                  ]
                }
                {candidate.status !== "published" ? " · not live yet" : ""}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {editable ? (
        <div className="flex items-center gap-4">
          <Button
            disabled={pending}
            onClick={() =>
              run(async () => {
                const result = await saveBundleItems(releaseId, chosen);
                if (result.ok) setSaved(true);
                return result;
              })
            }
          >
            {pending ? "Saving…" : "Save bundle"}
          </Button>
          {saved ? (
            <p role="status" className="text-sm text-success">
              Saved.
            </p>
          ) : null}
        </div>
      ) : null}
      <ErrorText error={error} />
    </div>
  );
}

export function SubmitForm({
  action,
  checklist,
}: {
  action: Action;
  checklist: { label: string; done: boolean }[];
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const ready = checklist.every((item) => item.done);
  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <ul className="flex flex-col gap-2 text-sm">
        {checklist.map((item) => (
          <li key={item.label} className="flex items-center gap-3">
            <span
              aria-hidden
              className={`inline-flex size-6 items-center justify-center rounded-full text-xs ${item.done ? "bg-success/20 text-success" : "border border-line-strong text-muted"}`}
            >
              {item.done ? "✓" : ""}
            </span>
            <span className={item.done ? "" : "text-muted"}>
              {item.label}
              <span className="sr-only">
                {item.done ? " (done)" : " (to do)"}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="rights"
          className="mt-0.5 size-5 shrink-0 accent-(--accent)"
        />
        <span>
          I own or control all rights in this music, artwork and samples, and
          can sell it as downloads worldwide.
          {fieldError(state, "rights") ? (
            <span className="block text-danger">
              {fieldError(state, "rights")}
            </span>
          ) : null}
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="terms"
          className="mt-0.5 size-5 shrink-0 accent-(--accent)"
        />
        <span>
          I accept the{" "}
          <a
            href="/legal/music-seller-terms"
            target="_blank"
            className="underline underline-offset-4"
          >
            music seller terms
          </a>
          .
          {fieldError(state, "terms") ? (
            <span className="block text-danger">
              {fieldError(state, "terms")}
            </span>
          ) : null}
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending || !ready}>
          {pending ? "Sending…" : "Send for review"}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}

export function ReleaseStatusActions({
  releaseId,
  status,
  from = "dashboard",
}: {
  releaseId: string;
  status: MusicReleaseStatus;
  /** Where to land after deleting. */
  from?: "dashboard" | "admin";
}) {
  const { pending, error, run } = useResultAction();
  const link =
    "min-h-11 text-sm underline-offset-4 hover:underline disabled:opacity-50";
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      {status === "in_review" ? (
        <button
          type="button"
          disabled={pending}
          className={`${link} text-muted hover:text-text`}
          onClick={() =>
            run(
              () => returnToDraft(releaseId),
              "Take it out of review to edit it? You'll need to send it again.",
            )
          }
        >
          Withdraw from review
        </button>
      ) : null}
      {status === "rejected" || status === "archived" ? (
        <button
          type="button"
          disabled={pending}
          className={`${link} text-muted hover:text-text`}
          onClick={() => run(() => returnToDraft(releaseId))}
        >
          Edit and resubmit
        </button>
      ) : null}
      {status === "published" ? (
        <button
          type="button"
          disabled={pending}
          className={`${link} text-muted hover:text-text`}
          onClick={() =>
            run(
              () => unpublishRelease(releaseId),
              "Take this release off the store? Buyers keep their downloads.",
            )
          }
        >
          Unpublish
        </button>
      ) : null}
      {status === "draft" || status === "rejected" ? (
        <button
          type="button"
          disabled={pending}
          className={`${link} text-danger`}
          onClick={() =>
            run(
              () => deleteRelease(releaseId, from),
              "Delete this release and all its files? This can't be undone.",
            )
          }
        >
          Delete release
        </button>
      ) : null}
      <ErrorText error={error} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Earnings
// ---------------------------------------------------------------------------

export function PayoutDetailsForm({
  details,
  action,
}: {
  details: ArtistPayoutDetailsRow | null;
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form action={formAction} className="grid gap-5 sm:grid-cols-2" noValidate>
      <Field
        name="account_holder"
        label="Account holder"
        required
        autoComplete="name"
        defaultValue={fieldValue(
          state,
          "account_holder",
          details?.account_holder,
        )}
        error={fieldError(state, "account_holder")}
        className="sm:col-span-2"
      />
      <Field
        name="iban"
        label="IBAN"
        required
        autoComplete="off"
        spellCheck={false}
        defaultValue={fieldValue(state, "iban", details?.iban)}
        error={fieldError(state, "iban")}
      />
      <Field
        name="bic"
        label="BIC / SWIFT"
        hint="Optional inside the EU."
        autoComplete="off"
        spellCheck={false}
        defaultValue={fieldValue(state, "bic", details?.bic)}
        error={fieldError(state, "bic")}
      />
      <Field
        name="country"
        label="Bank country"
        hint="Two letters, e.g. DE."
        maxLength={2}
        defaultValue={fieldValue(state, "country", details?.country)}
        error={fieldError(state, "country")}
      />
      <div className="flex items-end gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save bank details"}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}

export function WithdrawalForm({
  available,
  minimum,
  currency,
  action,
}: {
  available: number;
  minimum: number;
  currency: string;
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const enough = available >= minimum;
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-wrap items-end gap-4">
        <Field
          name="amount"
          label="Amount (EUR)"
          inputMode="decimal"
          disabled={!enough}
          defaultValue={fieldValue(
            state,
            "amount",
            enough ? centsToInput(available) : "",
          )}
          error={fieldError(state, "amount")}
          hint={`Minimum ${formatCents(minimum, currency)}.`}
          className="w-48"
        />
        <Button type="submit" disabled={pending || !enough} className="mb-7">
          {pending ? "Requesting…" : "Request payout"}
        </Button>
      </div>
      {!enough ? (
        <p className="text-sm text-muted">
          You can request a payout once {formatCents(minimum, currency)} is
          available.
        </p>
      ) : null}
      <FormStatus state={state} />
    </form>
  );
}

export function CancelWithdrawalButton({
  withdrawalId,
}: {
  withdrawalId: string;
}) {
  const { pending, error, run } = useResultAction();
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          run(
            () => cancelWithdrawal(withdrawalId),
            "Cancel this payout request?",
          )
        }
        className="min-h-11 text-sm text-muted underline-offset-4 hover:text-text hover:underline"
      >
        Cancel
      </button>
      <ErrorText error={error} />
    </>
  );
}
