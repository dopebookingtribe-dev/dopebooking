"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, SelectField, TextareaField } from "@/components/ui/field";
import { fieldError } from "@/components/ui/form-helpers";
import { FormStatus } from "@/components/ui/form-status";
import { initialFormState, type FormState } from "@/lib/forms";
import { CURRENCIES } from "../constants";

const QUIET = new Set(["declined", "cancelled", "expired"]);

/** Staff control for moving a request along its workflow. */
export function StatusActions({
  allowed,
  actionLabels,
  defaultCurrency,
  quoteLabel = "Quote",
  action,
}: {
  allowed: string[];
  actionLabels: Record<string, string>;
  defaultCurrency: string;
  quoteLabel?: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const [to, setTo] = useState(allowed[0] ?? "");

  if (!allowed.length) {
    return (
      <p className="text-sm text-muted">
        This request is closed. No further steps.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <SelectField
        name="to"
        label="Next step"
        value={to}
        onChange={(event) => setTo(event.target.value)}
      >
        {allowed.map((status) => (
          <option key={status} value={status}>
            {actionLabels[status] ?? status}
          </option>
        ))}
      </SelectField>

      {to === "quoted" ? (
        <div className="flex flex-col gap-5 rounded-(--radius) border border-accent/40 p-4">
          <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
            <Field
              name="quote_amount"
              label={quoteLabel}
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
          variant={QUIET.has(to) ? "secondary" : "primary"}
        >
          {pending ? "Saving…" : (actionLabels[to] ?? "Update")}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
