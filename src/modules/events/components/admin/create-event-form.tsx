"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, SelectField } from "@/components/ui/field";
import { fieldError, fieldValue } from "@/components/ui/form-helpers";
import { FormStatus } from "@/components/ui/form-status";
import { initialFormState } from "@/lib/forms";
import { createEvent } from "../../actions";

export function CreateEventForm({ timeZones }: { timeZones: string[] }) {
  const [state, action, pending] = useActionState(
    createEvent,
    initialFormState,
  );
  return (
    <form action={action} className="flex max-w-xl flex-col gap-5" noValidate>
      <Field
        name="title"
        label="Event name"
        required
        autoComplete="off"
        defaultValue={fieldValue(state, "title", null)}
        error={fieldError(state, "title")}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          name="starts_at"
          label="Starts"
          type="datetime-local"
          required
          defaultValue={fieldValue(state, "starts_at", null)}
          error={fieldError(state, "starts_at")}
        />
        <SelectField
          name="timezone"
          label="Time zone"
          defaultValue={fieldValue(state, "timezone", "Europe/Berlin")}
          error={fieldError(state, "timezone")}
        >
          {timeZones.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replaceAll("_", " ")}
            </option>
          ))}
        </SelectField>
      </div>
      <FormStatus state={state} />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Creating…" : "Create draft"}
      </Button>
    </form>
  );
}
