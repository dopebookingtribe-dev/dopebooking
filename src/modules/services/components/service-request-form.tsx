"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, SelectField, TextareaField } from "@/components/ui/field";
import { fieldError, fieldValue } from "@/components/ui/form-helpers";
import { FormStatus } from "@/components/ui/form-status";
import { initialFormState, type FormState } from "@/lib/forms";
import type { ServiceType } from "@/lib/supabase/database.types";
import { CURRENCIES } from "@/modules/workflow/constants";
import { DETAIL_FIELDS, SERVICE_LABELS, type DetailField } from "../schemas";

function DetailInput({
  field,
  state,
}: {
  field: DetailField;
  state: FormState;
}) {
  const name = `d.${field.name}`;
  const error = fieldError(state, name);
  const value = fieldValue(state, name, null);

  switch (field.kind) {
    case "text":
    case "url":
    case "date":
      return (
        <Field
          name={name}
          label={field.label}
          hint={field.hint}
          type={field.kind === "text" ? "text" : field.kind}
          placeholder={field.kind === "url" ? "https://" : undefined}
          defaultValue={value}
          error={error}
        />
      );
    case "number":
      return (
        <Field
          name={name}
          label={field.label}
          hint={field.hint}
          type="number"
          inputMode="numeric"
          min={field.min}
          max={field.max}
          defaultValue={value}
          error={error}
        />
      );
    case "select":
      return (
        <SelectField
          name={name}
          label={field.label}
          hint={field.hint}
          defaultValue={value}
          error={error}
        >
          <option value="">Choose…</option>
          {Object.entries(field.options).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </SelectField>
      );
    case "yesno":
      return (
        <SelectField
          name={name}
          label={field.label}
          hint={field.hint}
          defaultValue={value}
          error={error}
        >
          <option value="">Not sure</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </SelectField>
      );
    case "multi": {
      const selected = (state.values?.[name] as string[] | undefined) ?? [];
      return (
        <fieldset className="flex flex-col gap-3 sm:col-span-full">
          <legend className="mb-3 text-sm font-medium">
            {field.label}
            {field.required ? "" : " (optional)"}
          </legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(field.options).map(([key, label]) => (
              <label
                key={key}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line-strong px-4 text-sm has-checked:border-accent has-checked:text-accent"
              >
                <input
                  type="checkbox"
                  name={name}
                  value={key}
                  defaultChecked={selected.includes(key)}
                  className="accent-(--accent)"
                />
                {label}
              </label>
            ))}
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </fieldset>
      );
    }
  }
}

export function ServiceRequestForm({
  types,
  countries,
  action,
}: {
  types: readonly ServiceType[];
  countries: { code: string; name: string }[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const [type, setType] = useState<ServiceType>(
    (state.values?.service_type as ServiceType | undefined) ?? types[0],
  );
  const value = (name: string, fallback = "") =>
    fieldValue(state, name, null, fallback);
  const error = (name: string) => fieldError(state, name);

  return (
    <form action={formAction} className="flex flex-col gap-10" noValidate>
      {types.length > 1 ? (
        <fieldset>
          <legend className="mb-4 font-display text-3xl">
            What do you need?
          </legend>
          <div className="flex flex-wrap gap-2">
            {types.map((option) => (
              <label
                key={option}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line-strong px-5 text-sm has-checked:border-accent has-checked:text-accent"
              >
                <input
                  type="radio"
                  name="service_type"
                  value={option}
                  checked={type === option}
                  onChange={() => setType(option)}
                  className="accent-(--accent)"
                />
                {SERVICE_LABELS[option]}
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <input type="hidden" name="service_type" value={types[0]} />
      )}

      <fieldset className="flex flex-col gap-6">
        <legend className="mb-2 font-display text-3xl">The event</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            name="event_name"
            label="Event name"
            required
            defaultValue={value("event_name")}
            error={error("event_name")}
          />
          <Field
            name="organisation"
            label="Organiser / company (optional)"
            defaultValue={value("organisation")}
            error={error("organisation")}
          />
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            name="event_start"
            label="Starts"
            type="date"
            required
            min={new Date().toISOString().slice(0, 10)}
            defaultValue={value("event_start")}
            error={error("event_start")}
          />
          <Field
            name="event_end"
            label="Ends (optional)"
            type="date"
            defaultValue={value("event_end")}
            error={error("event_end")}
          />
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          <Field
            name="city"
            label="City"
            required
            defaultValue={value("city")}
            error={error("city")}
          />
          <SelectField
            name="country"
            label="Country"
            required
            defaultValue={value("country")}
            error={error("country")}
          >
            <option value="">Choose…</option>
            {countries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </SelectField>
          <Field
            name="expected_attendance"
            label="Expected guests"
            type="number"
            inputMode="numeric"
            min={1}
            defaultValue={value("expected_attendance")}
            error={error("expected_attendance")}
          />
        </div>
        <Field
          name="venue_name"
          label="Venue (optional)"
          defaultValue={value("venue_name")}
          error={error("venue_name")}
        />
      </fieldset>

      {types.map((option) => (
        // Only the chosen service's questions are shown and submitted.
        <fieldset
          key={option}
          disabled={option !== type}
          hidden={option !== type}
          className="flex flex-col gap-6"
        >
          <legend className="mb-2 font-display text-3xl">
            {SERVICE_LABELS[option]}
          </legend>
          <div className="grid gap-6 sm:grid-cols-2">
            {DETAIL_FIELDS[option].map((field) => (
              <DetailInput key={field.name} field={field} state={state} />
            ))}
          </div>
        </fieldset>
      ))}

      <fieldset className="flex flex-col gap-6">
        <legend className="mb-2 font-display text-3xl">
          Budget &amp; contact
        </legend>
        <div className="grid gap-6 sm:grid-cols-[1fr_8rem]">
          <Field
            name="budget_amount"
            label="Budget (optional)"
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={value("budget_amount")}
            error={error("budget_amount")}
          />
          <SelectField
            name="budget_currency"
            label="Currency"
            defaultValue={value("budget_currency", "EUR")}
          >
            {CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </SelectField>
        </div>
        <TextareaField
          name="message"
          label="Anything else? (optional)"
          rows={5}
          defaultValue={value("message")}
          error={error("message")}
        />
        <Field
          name="contact_phone"
          label="Phone (optional)"
          type="tel"
          autoComplete="tel"
          hint="Only our team sees this."
          defaultValue={value("contact_phone")}
          error={error("contact_phone")}
        />
      </fieldset>

      <div className="flex flex-col gap-3">
        <FormStatus state={state} />
        {state.status === "error" && !state.message ? (
          <p role="alert" className="text-sm text-danger">
            Please check the highlighted fields.
          </p>
        ) : null}
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Sending…" : "Send request"}
        </Button>
        <p className="text-sm text-muted">
          Free and without obligation. We reply with a quote.
        </p>
      </div>
    </form>
  );
}
