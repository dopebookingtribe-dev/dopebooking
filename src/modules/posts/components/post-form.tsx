"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, SelectField, TextareaField } from "@/components/ui/field";
import { fieldError, fieldValue } from "@/components/ui/form-helpers";
import { FormStatus } from "@/components/ui/form-status";
import { initialFormState, type FormState } from "@/lib/forms";
import type { PostRow } from "@/lib/supabase/database.types";
import { STATUSES } from "@/lib/validation";
import type { LibraryImage } from "@/modules/cms/admin-queries";
import { MEDIA_KINDS, type MediaKind } from "@/modules/media/constants";
import { LibraryUploader } from "@/modules/media/components/library-uploader";
import {
  IMAGE_SPECS,
  ratioLabel,
  sizeLabel,
} from "@/modules/media/image-specs";
import { POST_CATEGORIES, POST_TIME_ZONE } from "../schemas";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;
type FileOption = { id: string; kind: MediaKind; title: string; url: string };

const TOKEN: Record<MediaKind, string> = {
  image: "photo",
  video: "video",
  audio: "audio",
  document: "file",
};

/** Body editor with formatting buttons and media-library embeds. */
function BodyEditor({
  defaultValue,
  error,
  files,
}: {
  defaultValue: string;
  error?: string;
  files: FileOption[];
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [embedId, setEmbedId] = useState("");

  const insert = (before: string, after = "", placeholder = "") => {
    const area = ref.current;
    if (!area) return;
    const { selectionStart: start, selectionEnd: end, value } = area;
    const selected = value.slice(start, end) || placeholder;
    const text = `${before}${selected}${after}`;
    area.setRangeText(text, start, end, "end");
    area.focus();
  };
  const insertBlock = (line: string) => {
    const area = ref.current;
    if (!area) return;
    const { selectionStart: start, value } = area;
    const needsBreak = start > 0 && value[start - 1] !== "\n";
    area.setRangeText(
      `${needsBreak ? "\n\n" : ""}${line}\n\n`,
      start,
      start,
      "end",
    );
    area.focus();
  };
  const tool =
    "min-h-9 rounded-full border border-line-strong px-3 text-xs text-muted hover:border-accent hover:text-text";

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex flex-wrap items-center gap-2"
        role="toolbar"
        aria-label="Formatting"
      >
        <button
          type="button"
          className={tool}
          onClick={() => insertBlock("## Heading")}
        >
          Heading
        </button>
        <button
          type="button"
          className={tool}
          onClick={() => insert("**", "**", "bold text")}
        >
          Bold
        </button>
        <button
          type="button"
          className={tool}
          onClick={() => insert("*", "*", "italic text")}
        >
          Italic
        </button>
        <button
          type="button"
          className={tool}
          onClick={() => insert("[", "](https://)", "link text")}
        >
          Link
        </button>
        <button
          type="button"
          className={tool}
          onClick={() => insertBlock("- First point\n- Second point")}
        >
          List
        </button>
        <button
          type="button"
          className={tool}
          onClick={() => insertBlock("> A line worth quoting")}
        >
          Quote
        </button>
      </div>
      <TextareaField
        ref={ref}
        name="body"
        label="Text"
        rows={18}
        defaultValue={defaultValue}
        error={error}
        hint="Blank lines start a new paragraph. ## makes a heading, - a list, > a quote. A line with only a YouTube or Vimeo link shows the player."
      />
      <div className="flex flex-wrap items-end gap-2 rounded-(--radius) border border-line bg-surface-1 p-3">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          <span className="font-medium">Insert from the media library</span>
          <select
            value={embedId}
            onChange={(event) => setEmbedId(event.target.value)}
            className="min-h-11 rounded-lg border border-line-strong bg-bg px-3"
          >
            <option value="">Choose a photo, video, audio file or PDF…</option>
            {(["image", "video", "audio", "document"] as MediaKind[]).map(
              (kind) => {
                const list = files.filter((file) => file.kind === kind);
                return list.length ? (
                  <optgroup key={kind} label={MEDIA_KINDS[kind].plural}>
                    {list.map((file) => (
                      <option key={file.id} value={file.id}>
                        {file.title}
                      </option>
                    ))}
                  </optgroup>
                ) : null;
              },
            )}
          </select>
        </label>
        <Button
          variant="secondary"
          disabled={!embedId}
          onClick={() => {
            const file = files.find((f) => f.id === embedId);
            if (file) insertBlock(`[[${TOKEN[file.kind]}:${file.id}]]`);
          }}
        >
          Insert at cursor
        </Button>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted">
          Upload new media for this post
        </summary>
        <div className="mt-3">
          <LibraryUploader showRules />
          <p className="mt-2 text-xs text-muted">
            New uploads appear in the list above after they finish.
          </p>
        </div>
      </details>
    </div>
  );
}

function CoverPicker({
  images,
  defaultValue,
  error,
}: {
  images: LibraryImage[];
  defaultValue: string;
  error?: string;
}) {
  const [cover, setCover] = useState(defaultValue);
  const chosen = images.find((image) => image.id === cover);
  const spec = IMAGE_SPECS["news-cover"];
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-medium">Cover photo (optional)</legend>
      <p className="text-xs text-muted">
        Recommended {sizeLabel(spec.size)} ({ratioLabel(...spec.size)}), at
        least {sizeLabel(spec.min)}. {MEDIA_KINDS.image.formats}, up to 8 MB.
        Cards crop it to 3:2.
      </p>
      <input type="hidden" name="cover_asset_id" value={cover} />
      <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
        <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-surface-2">
          {chosen ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={chosen.url}
              alt=""
              className="size-full object-cover"
              style={{ objectPosition: `${chosen.focalX}% ${chosen.focalY}%` }}
            />
          ) : (
            <span className="flex size-full items-center justify-center text-xs text-muted">
              No cover
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <select
            value={cover}
            onChange={(event) => setCover(event.target.value)}
            aria-invalid={error ? true : undefined}
            className="min-h-11 rounded-(--radius) border border-line-strong bg-surface-1 px-3 aria-invalid:border-danger"
          >
            <option value="">No cover</option>
            {cover && !chosen ? (
              <option value={cover}>Just uploaded</option>
            ) : null}
            {images.map((image) => (
              <option key={image.id} value={image.id}>
                {image.alt} ({image.width} × {image.height})
              </option>
            ))}
          </select>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <details className="text-sm">
            <summary className="cursor-pointer text-muted">
              Upload a new cover
            </summary>
            <div className="mt-3">
              <LibraryUploader
                kinds={["image"]}
                multiple={false}
                showRules={false}
                label="Drop the cover photo here"
                onUploaded={(ids) => ids[0] && setCover(ids[0])}
              />
            </div>
          </details>
        </div>
      </div>
    </fieldset>
  );
}

export function PostForm({
  post,
  publishedAtInput,
  artists,
  events,
  images,
  files,
  action,
}: {
  post: PostRow;
  publishedAtInput: string;
  artists: { id: string; stage_name: string }[];
  events: { id: string; title: string; starts_at: string }[];
  images: LibraryImage[];
  files: FileOption[];
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const value = (name: keyof PostRow) => fieldValue(state, name, post[name]);
  const error = (name: string) => fieldError(state, name);
  const featured = state.values
    ? state.values.featured === "on"
    : post.featured;

  return (
    <form action={formAction} className="flex flex-col gap-8" noValidate>
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
          hint={`Public page: /news/${value("slug")}`}
          required
          defaultValue={value("slug")}
          error={error("slug")}
        />
      </div>
      <TextareaField
        name="excerpt"
        label="Summary"
        rows={2}
        maxLength={400}
        hint="One or two sentences for cards and search results."
        defaultValue={value("excerpt")}
        error={error("excerpt")}
      />
      <CoverPicker
        images={images}
        defaultValue={fieldValue(
          state,
          "cover_asset_id",
          post.cover_asset_id ?? "",
        )}
        error={error("cover_asset_id")}
      />
      <BodyEditor
        defaultValue={value("body")}
        error={error("body")}
        files={files}
      />

      <div className="grid gap-6 sm:grid-cols-3">
        <Field
          name="category"
          label="Category"
          list="post-categories"
          maxLength={40}
          defaultValue={value("category")}
          error={error("category")}
        />
        <datalist id="post-categories">
          {POST_CATEGORIES.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
        <Field
          name="tags"
          label="Tags"
          hint="Separate with commas."
          defaultValue={fieldValue(state, "tags", post.tags.join(", "))}
          error={error("tags")}
        />
        <Field
          name="author_name"
          label="Author (optional)"
          maxLength={80}
          defaultValue={value("author_name")}
          error={error("author_name")}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <SelectField
          name="artist_id"
          label="Related artist (optional)"
          defaultValue={value("artist_id")}
          error={error("artist_id")}
        >
          <option value="">None</option>
          {artists.map((artist) => (
            <option key={artist.id} value={artist.id}>
              {artist.stage_name}
            </option>
          ))}
        </SelectField>
        <SelectField
          name="event_id"
          label="Related event (optional)"
          defaultValue={value("event_id")}
          error={error("event_id")}
        >
          <option value="">None</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title} ({event.starts_at.slice(0, 4)})
            </option>
          ))}
        </SelectField>
      </div>

      <div className="grid gap-6 rounded-(--radius) border border-line p-5 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField
          name="status"
          label="Status"
          hint="Only published posts are public."
          defaultValue={value("status")}
        >
          {Object.entries(STATUSES).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </SelectField>
        <Field
          name="published_at"
          label="Publish date"
          type="datetime-local"
          hint={`${POST_TIME_ZONE} time. A future date schedules it; empty means now.`}
          defaultValue={fieldValue(state, "published_at", publishedAtInput)}
          error={error("published_at")}
        />
        <Field
          name="sort_order"
          label="Order among featured"
          type="number"
          min={0}
          max={9999}
          defaultValue={value("sort_order")}
          error={error("sort_order")}
        />
        <label className="flex min-h-11 items-center gap-3 self-center text-sm">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={featured}
            className="size-4 accent-(--accent)"
          />
          Featured (leads the News page)
        </label>
      </div>

      <details
        className="rounded-(--radius) border border-line p-5"
        open={Boolean(error("seo_title") || error("seo_description"))}
      >
        <summary className="cursor-pointer text-sm font-medium">
          Search and sharing
        </summary>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <Field
            name="seo_title"
            label="Search title"
            maxLength={70}
            hint="Empty uses the post title."
            defaultValue={value("seo_title")}
            error={error("seo_title")}
          />
          <Field
            name="seo_description"
            label="Search description"
            maxLength={200}
            hint="Empty uses the summary."
            defaultValue={value("seo_description")}
            error={error("seo_description")}
          />
        </div>
      </details>

      <div className="sticky bottom-0 -mx-2 flex flex-wrap items-center gap-4 border-t border-line bg-bg/95 px-2 py-4 backdrop-blur">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save post"}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
