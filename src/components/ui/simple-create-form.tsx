"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { fieldError, fieldValue } from "@/components/ui/form-helpers";
import { FormStatus } from "@/components/ui/form-status";
import { initialFormState, type FormState } from "@/lib/forms";

/** Small "create a draft" form: a few text fields and a submit button. */
export function SimpleCreateForm({
  action,
  fields,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  fields: { name: string; label: string; hint?: string; type?: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form
      action={formAction}
      className="flex max-w-xl flex-col gap-5"
      noValidate
    >
      {fields.map((field) => (
        <Field
          key={field.name}
          name={field.name}
          label={field.label}
          hint={field.hint}
          type={field.type ?? "text"}
          required
          autoComplete="off"
          defaultValue={fieldValue(state, field.name, null)}
          error={fieldError(state, field.name)}
        />
      ))}
      <FormStatus state={state} />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Creating…" : "Create draft"}
      </Button>
    </form>
  );
}
