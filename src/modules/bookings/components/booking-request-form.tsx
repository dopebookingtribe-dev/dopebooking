"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, SelectField, TextareaField } from "@/components/ui/field";
import { fieldError, fieldValue } from "@/components/ui/form-helpers";
import { FormStatus } from "@/components/ui/form-status";
import { initialFormState, type FormState } from "@/lib/forms";
import { CURRENCIES, SET_LENGTHS, todayIso } from "../schemas";

export function BookingRequestForm({
  artistName,
  countries,
  action,
}: {
  artistName: string;
  countries: { code: string; name: string }[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const value = (name: string, fallback = "") =>
    fieldValue(state, name, null, fallback);
  const error = (name: string) => fieldError(state, name);

  return (
    <form action={formAction} className="flex flex-col gap-8" noValidate>
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
        <div className="grid gap-6 sm:grid-cols-3">
          <Field
            name="event_date"
            label="Date"
            type="date"
            min={todayIso()}
            required
            defaultValue={value("event_date")}
            error={error("event_date")}
          />
          <Field
            name="city"
            label="City"
            required
            autoComplete="address-level2"
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
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          <Field
            name="venue_name"
            label="Venue (optional)"
            defaultValue={value("venue_name")}
            error={error("venue_name")}
          />
          <Field
            name="expected_attendance"
            label="Expected guests"
            type="number"
            inputMode="numeric"
            min={1}
            defaultValue={value("expected_attendance")}
            error={error("expected_attendance")}
          />
          <SelectField
            name="set_length_minutes"
            label="Set length"
            defaultValue={value("set_length_minutes", "120")}
            error={error("set_length_minutes")}
          >
            {SET_LENGTHS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes / 60} h
              </option>
            ))}
          </SelectField>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-6">
        <legend className="mb-2 font-display text-3xl">
          Budget &amp; details
        </legend>
        <div className="grid gap-6 sm:grid-cols-[1fr_8rem]">
          <Field
            name="budget_amount"
            label="Budget (optional)"
            type="number"
            inputMode="numeric"
            min={0}
            hint="Artist fee only, excluding travel and accommodation."
            defaultValue={value("budget_amount")}
            error={error("budget_amount")}
          />
          <SelectField
            name="budget_currency"
            label="Currency"
            defaultValue={value("budget_currency", "EUR")}
            error={error("budget_currency")}
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
          label={`Anything else ${artistName} should know? (optional)`}
          rows={5}
          hint="Slot time, other artists, travel, hospitality…"
          defaultValue={value("message")}
          error={error("message")}
        />
        <Field
          name="contact_phone"
          label="Phone (optional)"
          type="tel"
          autoComplete="tel"
          hint="Only our booking team sees this."
          defaultValue={value("contact_phone")}
          error={error("contact_phone")}
        />
      </fieldset>

      <div className="flex flex-col gap-3">
        <FormStatus state={state} />
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Sending…" : "Send booking request"}
        </Button>
        <p className="text-sm text-muted">
          Sending a request is free and doesn&apos;t commit you to anything. We
          reply with availability and a quote.
        </p>
      </div>
    </form>
  );
}
