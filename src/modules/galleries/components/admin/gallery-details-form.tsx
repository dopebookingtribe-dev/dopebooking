"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, SelectField, TextareaField } from "@/components/ui/field";
import { fieldError, fieldValue } from "@/components/ui/form-helpers";
import { FormStatus } from "@/components/ui/form-status";
import { initialFormState, type FormState } from "@/lib/forms";
import type { GalleryRow } from "@/lib/supabase/database.types";
import { STATUSES } from "@/lib/validation";

export function GalleryDetailsForm({
  gallery,
  eventOptions,
  action,
}: {
  gallery: GalleryRow;
  eventOptions: { id: string; title: string; starts_at: string }[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const value = (name: keyof GalleryRow) =>
    fieldValue(state, name, gallery[name]);
  const error = (name: string) => fieldError(state, name);

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          name="title"
          label="Gallery name"
          required
          defaultValue={value("title")}
          error={error("title")}
        />
        <Field
          name="slug"
          label="URL name"
          hint={`Public page: /gallery/${value("slug")}`}
          required
          defaultValue={value("slug")}
          error={error("slug")}
        />
      </div>
      <TextareaField
        name="description"
        label="Description"
        rows={4}
        defaultValue={value("description")}
        error={error("description")}
      />
      <div className="grid gap-6 sm:grid-cols-3">
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
        <Field
          name="photographer"
          label="Photographer"
          defaultValue={value("photographer")}
          error={error("photographer")}
        />
        <SelectField
          name="status"
          label="Status"
          defaultValue={value("status")}
        >
          {Object.entries(STATUSES).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </SelectField>
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
