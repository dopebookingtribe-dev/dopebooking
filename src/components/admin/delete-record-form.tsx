"use client";

import { useActionState, type ReactNode } from "react";
import { FormStatus } from "@/components/ui/form-status";
import { initialFormState, type FormState } from "@/lib/forms";

/**
 * Destructive action with a confirmation step. The server action does the
 * real checks (permission, linked records) and explains any refusal.
 */
export function DeleteRecordForm({
  label,
  confirm,
  action,
  children,
}: {
  label: string;
  confirm: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  /** Extra options, e.g. "also delete the uploaded file". */
  children?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form action={formAction} className="flex flex-col items-start gap-4">
      {children}
      <button
        type="submit"
        disabled={pending}
        onClick={(event) => {
          if (!window.confirm(confirm)) event.preventDefault();
        }}
        className="inline-flex min-h-11 items-center rounded-full border border-danger px-6 text-sm font-semibold text-danger hover:bg-danger hover:text-bg disabled:opacity-50"
      >
        {pending ? "Deleting…" : label}
      </button>
      <FormStatus state={state} />
    </form>
  );
}
