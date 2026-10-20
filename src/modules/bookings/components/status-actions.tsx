"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, SelectField, TextareaField } from "@/components/ui/field";
import { fieldError } from "@/components/ui/form-helpers";
import { FormStatus } from "@/components/ui/form-status";
import { initialFormState, type FormState } from "@/lib/forms";
import type { BookingStatus } from "@/lib/supabase/database.types";
import { CURRENCIES, TRANSITION_LABELS } from "../schemas";

/** Staff control for moving a booking along the workflow. */
export function StatusActions({
  allowed,
  defaultCurrency,
  action,
}: {
  allowed: BookingStatus[];
  defaultCurrency: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const [to, setTo] = useState<BookingStatus>(allowed[0]);

  if (!allowed.length) {
    return (
      <p className="text-sm text-muted">
        This booking is closed. No further steps.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <SelectField
        name="to"
        label="Next step"
        value={to}
        onChange={(event) => setTo(event.target.value as BookingStatus)}
      >
        {allowed.map((status) => (
          <option key={status} value={status}>
            {TRANSITION_LABELS[status] ?? status}
          </option>
        ))}
      </SelectField>

      {to === "quoted" ? (
        <div className="flex flex-col gap-5 rounded-(--radius) border border-accent/40 p-4">
          <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
            <Field
              name="quote_amount"
              label="Quote (artist fee)"
              type="number"
              inputMode="numeric"
              min={0}
              required
              error={fieldError(state, "quote_amount")}
            />
            <SelectField
              name="quote_currency"
              label="Currency"
              defaultValue={defaultCurrency}
            >
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </SelectField>
          </div>
          <TextareaField
            name="quote_note"
            label="What's included (shown to the requester)"
            rows={3}
            hint="e.g. “Excl. flights from TLV and 2 nights hotel; 50% deposit on contract.”"
          />
        </div>
      ) : null}

      <TextareaField
        name="note"
        label="Note to the requester (optional)"
        rows={3}
        hint="Shown in their timeline and email."
        error={fieldError(state, "note")}
      />
      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="submit"
          disabled={pending}
          variant={
            to === "declined" || to === "cancelled" ? "secondary" : "primary"
          }
        >
          {pending ? "Saving…" : (TRANSITION_LABELS[to] ?? "Update")}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
