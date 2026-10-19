"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, SelectField, TextareaField } from "@/components/ui/field";
import { fieldError, fieldValue } from "@/components/ui/form-helpers";
import { FormStatus } from "@/components/ui/form-status";
import { initialFormState, type FormState } from "@/lib/forms";
import type { VideoRow } from "@/lib/supabase/database.types";
import { STATUSES } from "@/lib/validation";
import { sourceUrl } from "@/lib/video";

export function VideoDetailsForm({
  video,
  eventOptions,
  artistOptions,
  action,
}: {
  video: VideoRow;
  eventOptions: { id: string; title: string; starts_at: string }[];
  artistOptions: { id: string; stage_name: string }[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const value = (name: keyof VideoRow) => fieldValue(state, name, video[name]);
  const error = (name: string) => fieldError(state, name);
  const featured = state.values
    ? state.values.featured === "on"
    : video.featured;

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
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
          hint={`Public page: /videos/${value("slug")}`}
          required
          defaultValue={value("slug")}
          error={error("slug")}
        />
      </div>
      <Field
        name="url"
        label="Video link"
        type="url"
        hint="Mux, Cloudflare Stream, YouTube or Vimeo."
        required
        defaultValue={fieldValue(
          state,
          "url",
          sourceUrl({ provider: video.provider, ref: video.provider_ref }),
        )}
        error={error("url")}
      />
      <TextareaField
        name="description"
        label="Description"
        rows={4}
        defaultValue={value("description")}
        error={error("description")}
      />
      <div className="grid gap-6 sm:grid-cols-2">
        <SelectField
          name="event_id"
          label="Event (optional)"
          defaultValue={value("event_id")}
          error={error("event_id")}
        >
          <option value="">None</option>
          {eventOptions.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title} ({event.starts_at.slice(0, 4)})
            </option>
          ))}
        </SelectField>
        <SelectField
          name="artist_id"
          label="Artist (optional)"
          defaultValue={value("artist_id")}
          error={error("artist_id")}
        >
          <option value="">None</option>
          {artistOptions.map((artist) => (
            <option key={artist.id} value={artist.id}>
              {artist.stage_name}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <SelectField
          name="status"
          label="Status"
          hint="Only published videos are public."
          defaultValue={value("status")}
        >
          {Object.entries(STATUSES).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </SelectField>
        <label className="flex min-h-11 items-center gap-3 self-center text-sm">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={featured}
            className="size-4 accent-(--accent)"
          />
          Featured
        </label>
      </div>
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save details"}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
