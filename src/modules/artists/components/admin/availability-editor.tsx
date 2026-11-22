"use client";

import { useActionState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, SelectField } from "@/components/ui/field";
import { fieldError, fieldValue } from "@/components/ui/form-helpers";
import { FormStatus } from "@/components/ui/form-status";
import { initialFormState, type FormState } from "@/lib/forms";
import type { AvailabilityStatus } from "@/lib/supabase/database.types";
import { AVAILABILITY_STATUSES, formatDateRange } from "../../availability";

type Row = {
  id: string;
  starts_on: string;
  ends_on: string;
  status: AvailabilityStatus;
  location: string | null;
  note: string | null;
  is_public: boolean;
};

export function AvailabilityEditor({
  rows,
  addAction,
  remove,
  togglePublic,
}: {
  rows: Row[];
  addAction: (prev: FormState, formData: FormData) => Promise<FormState>;
  remove: (id: string) => Promise<void>;
  togglePublic: (id: string, isPublic: boolean) => Promise<void>;
}) {
  const [state, action, pending] = useActionState(addAction, initialFormState);
  const [busy, start] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-8">
      {rows.length ? (
        <ul className="divide-y divide-line rounded-(--radius) border border-line">
          {rows.map((row) => (
            <li
              key={row.id}
              className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm ${row.ends_on < today ? "opacity-60" : ""}`}
            >
              <span>
                <span className="block font-medium">
                  {formatDateRange(row.starts_on, row.ends_on)}
                  {row.location ? ` · ${row.location}` : ""}
                </span>
                <span className="block text-muted">
                  {AVAILABILITY_STATUSES[row.status]}
                  {row.note ? ` · ${row.note}` : ""}
                  {row.ends_on < today ? " · past" : ""}
                </span>
              </span>
              <span className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={row.is_public}
                    disabled={busy}
                    onChange={(event) =>
                      start(() => togglePublic(row.id, event.target.checked))
                    }
                    className="size-4 accent-(--accent)"
                  />
                  Public
                </label>
                <button
                  type="button"
                  disabled={busy}
                  className="text-danger underline-offset-4 hover:underline"
                  onClick={() => {
                    if (window.confirm("Remove this window?"))
                      start(() => remove(row.id));
                  }}
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No dates yet.</p>
      )}
      <form
        action={action}
        className="grid gap-4 rounded-(--radius) border border-line p-4 sm:grid-cols-2 lg:grid-cols-3"
        noValidate
      >
        <Field
          name="starts_on"
          label="First day"
          type="date"
          required
          defaultValue={fieldValue(state, "starts_on", null)}
          error={fieldError(state, "starts_on")}
        />
        <Field
          name="ends_on"
          label="Last day"
          type="date"
          required
          defaultValue={fieldValue(state, "ends_on", null)}
          error={fieldError(state, "ends_on")}
        />
        <SelectField
          name="status"
          label="Status"
          defaultValue={fieldValue(state, "status", "available")}
        >
          {Object.entries(AVAILABILITY_STATUSES).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </SelectField>
        <Field
          name="location"
          label="Where (optional)"
          maxLength={120}
          placeholder="e.g. Brazil tour"
          defaultValue={fieldValue(state, "location", null)}
        />
        <Field
          name="note"
          label="Note (optional)"
          maxLength={300}
          placeholder="e.g. Open for club nights"
          defaultValue={fieldValue(state, "note", null)}
        />
        <label className="flex min-h-11 items-center gap-3 self-end text-sm">
          <input
            type="checkbox"
            name="is_public"
            className="size-4 accent-(--accent)"
          />
          Show on the artist page
        </label>
        <div className="flex items-center gap-4 sm:col-span-2 lg:col-span-3">
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Adding…" : "Add dates"}
          </Button>
          <FormStatus state={state} />
        </div>
      </form>
    </div>
  );
}
