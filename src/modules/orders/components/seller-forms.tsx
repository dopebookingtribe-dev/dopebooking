"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { fieldError, fieldValue } from "@/components/ui/form-helpers";
import { FormStatus } from "@/components/ui/form-status";
import { initialFormState, type FormState } from "@/lib/forms";
import { centsToInput } from "@/modules/marketplace/schemas";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/** A button that runs a server action and shows its error, if any. */
export function ActionButton({
  action,
  children,
  variant = "primary",
}: {
  action: () => Promise<FormState>;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <Button type="submit" variant={variant} disabled={pending}>
        {pending ? "Opening Stripe…" : children}
      </Button>
      <FormStatus state={state} />
    </form>
  );
}

export function ShippingForm({
  action,
  current,
}: {
  action: Action;
  current: number;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-4"
      noValidate
    >
      <Field
        name="shipping"
        label="Flat shipping per order (EUR)"
        inputMode="decimal"
        hint="Charged once per order with physical items. 0 for free shipping."
        defaultValue={fieldValue(
          state,
          "shipping",
          current ? centsToInput(current) : "0",
        )}
        error={fieldError(state, "shipping")}
        className="w-64"
      />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
      <FormStatus state={state} />
    </form>
  );
}

export function MarkShippedForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  if (state.status === "success") return <FormStatus state={state} />;
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="carrier"
          label="Carrier (optional)"
          placeholder="DHL, DPD, Correos…"
          error={fieldError(state, "carrier")}
        />
        <Field
          name="tracking"
          label="Tracking number (optional)"
          error={fieldError(state, "tracking")}
        />
      </div>
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Mark as shipped"}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
