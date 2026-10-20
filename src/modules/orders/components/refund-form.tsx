"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { fieldError } from "@/components/ui/form-helpers";
import { FormStatus } from "@/components/ui/form-status";
import { initialFormState, type FormState } from "@/lib/forms";
import { centsToInput } from "@/modules/marketplace/schemas";

export function RefundForm({
  refundable,
  action,
}: {
  refundable: number;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form
      action={formAction}
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Refund this amount to the buyer? This can't be undone.",
          )
        )
          event.preventDefault();
      }}
      noValidate
    >
      <Field
        name="amount"
        label="Amount to refund (EUR)"
        inputMode="decimal"
        defaultValue={centsToInput(refundable)}
        hint="Defaults to everything not yet refunded."
        error={fieldError(state, "amount")}
        className="max-w-xs"
      />
      <div className="flex items-center gap-4">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Refunding…" : "Refund"}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
