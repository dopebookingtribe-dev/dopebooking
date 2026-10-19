"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, TextareaField } from "@/components/ui/field";
import { FormStatus } from "@/components/ui/form-status";
import { initialFormState, type FormState } from "@/lib/forms";
import type { ArtistPrivateRow } from "@/lib/supabase/database.types";

export function ArtistPrivateForm({
  privateInfo,
  action,
}: {
  privateInfo: ArtistPrivateRow | null;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const value = (name: keyof ArtistPrivateRow, fallback = "") => {
    const submitted = state.values?.[name];
    if (submitted !== undefined) return submitted as string;
    const stored = privateInfo?.[name];
    return stored === null || stored === undefined ? fallback : String(stored);
  };
  const error = (name: string) => state.fieldErrors?.[name]?.[0];

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <div className="grid gap-6 sm:grid-cols-3">
        <Field
          name="fee_min"
          label="Fee from"
          type="number"
          inputMode="numeric"
          min={0}
          defaultValue={value("fee_min")}
          error={error("fee_min")}
        />
        <Field
          name="fee_max"
          label="Fee up to"
          type="number"
          inputMode="numeric"
          min={0}
          defaultValue={value("fee_max")}
          error={error("fee_max")}
        />
        <Field
          name="fee_currency"
          label="Currency"
          maxLength={3}
          defaultValue={value("fee_currency", "EUR")}
          error={error("fee_currency")}
        />
      </div>
      <Field
        name="booking_email"
        label="Booking contact email"
        type="email"
        defaultValue={value("booking_email")}
        error={error("booking_email")}
      />
      <TextareaField
        name="internal_notes"
        label="Internal notes"
        rows={4}
        defaultValue={value("internal_notes")}
        error={error("internal_notes")}
      />
      <div className="flex items-center gap-4">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Saving…" : "Save private info"}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
