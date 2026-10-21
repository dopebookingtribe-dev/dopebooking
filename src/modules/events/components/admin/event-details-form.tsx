"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, SelectField, TextareaField } from "@/components/ui/field";
import { fieldError, fieldValue } from "@/components/ui/form-helpers";
import { FormStatus } from "@/components/ui/form-status";
import { utcToZonedInput } from "@/lib/datetime";
import { initialFormState, type FormState } from "@/lib/forms";
import type { EventRow } from "@/lib/supabase/database.types";
import { STATUSES } from "@/lib/validation";

export function EventDetailsForm({
  event,
  action,
  countries,
  timeZones,
}: {
  event: EventRow;
  countries: { code: string; name: string }[];
  timeZones: string[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const value = (name: keyof EventRow) => fieldValue(state, name, event[name]);
  const error = (name: string) => fieldError(state, name);
  const featured = state.values
    ? state.values.featured === "on"
    : event.featured;

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          name="title"
          label="Event name"
          required
          defaultValue={value("title")}
          error={error("title")}
        />
        <Field
          name="slug"
          label="URL name"
          hint={`Public page: /events/${value("slug")}`}
          required
          defaultValue={value("slug")}
          error={error("slug")}
        />
      </div>
      <Field
        name="summary"
        label="Summary"
        hint="One line for cards, up to 200 characters."
        defaultValue={value("summary")}
        error={error("summary")}
      />
      <TextareaField
        name="description"
        label="Description"
        rows={8}
        hint="Separate paragraphs with an empty line."
        defaultValue={value("description")}
        error={error("description")}
      />

      <div className="grid gap-6 sm:grid-cols-3">
        <Field
          name="starts_at"
          label="Starts"
          type="datetime-local"
          required
          defaultValue={fieldValue(
            state,
            "starts_at",
            utcToZonedInput(event.starts_at, event.timezone),
          )}
          error={error("starts_at")}
        />
        <Field
          name="ends_at"
          label="Ends (optional)"
          type="datetime-local"
          defaultValue={fieldValue(
            state,
            "ends_at",
            utcToZonedInput(event.ends_at, event.timezone),
          )}
          error={error("ends_at")}
        />
        <SelectField
          name="timezone"
          label="Time zone"
          hint="Times are entered and shown in this zone."
          defaultValue={value("timezone")}
          error={error("timezone")}
        >
          {timeZones.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replaceAll("_", " ")}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <Field
          name="venue_name"
          label="Venue"
          defaultValue={value("venue_name")}
          error={error("venue_name")}
        />
        <Field
          name="city"
          label="City"
          defaultValue={value("city")}
          error={error("city")}
        />
        <SelectField
          name="country"
          label="Country"
          defaultValue={value("country")}
          error={error("country")}
        >
          <option value="">Not set</option>
          {countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </SelectField>
      </div>

      <Field
        name="ticket_url"
        label="Ticket link (optional)"
        type="url"
        placeholder="https://"
        defaultValue={value("ticket_url")}
        error={error("ticket_url")}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          name="seo_title"
          label="Search title"
          maxLength={70}
          hint="Empty uses the title."
          defaultValue={value("seo_title")}
          error={error("seo_title")}
        />
        <Field
          name="seo_description"
          label="Search description"
          maxLength={200}
          defaultValue={value("seo_description")}
          error={error("seo_description")}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <SelectField
          name="status"
          label="Status"
          hint="Only published events are public."
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
          Featured on the home page
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
