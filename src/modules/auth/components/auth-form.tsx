"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { initialFormState, type FormState } from "@/lib/forms";

type FieldConfig = {
  name: string;
  label: string;
  type: "text" | "email" | "password";
  autoComplete: string;
  hint?: string;
};

export function AuthForm({
  action,
  fields,
  submitLabel,
  children,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  fields: FieldConfig[];
  submitLabel: string;
  /** Extra form content, e.g. streamed hidden inputs. */
  children?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);

  if (state.status === "success") {
    return (
      <p
        role="status"
        className="rounded-(--radius) border border-success/40 bg-surface-1 p-4 text-sm"
      >
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {children}
      {fields.map((field) => (
        <Field
          key={field.name}
          name={field.name}
          label={field.label}
          type={field.type}
          autoComplete={field.autoComplete}
          hint={field.hint}
          required
          defaultValue={state.values?.[field.name]}
          error={state.fieldErrors?.[field.name]?.[0]}
        />
      ))}
      {state.message ? (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Please wait…" : submitLabel}
      </Button>
    </form>
  );
}
