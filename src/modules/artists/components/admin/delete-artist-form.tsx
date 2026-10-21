"use client";

import { useActionState } from "react";
import { FormStatus } from "@/components/ui/form-status";
import { initialFormState, type FormState } from "@/lib/forms";

export function DeleteArtistForm({
  name,
  action,
}: {
  name: string;
  action: (prev: FormState) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form action={formAction} className="flex flex-col items-start gap-4">
      <button
        type="submit"
        disabled={pending}
        onClick={(event) => {
          if (
            !window.confirm(
              `Delete ${name} and all their photos? This can't be undone.`,
            )
          ) {
            event.preventDefault();
          }
        }}
        className="inline-flex min-h-11 items-center rounded-full border border-danger px-6 text-sm font-semibold text-danger hover:bg-danger hover:text-bg"
      >
        {pending ? "Deleting…" : `Delete ${name}`}
      </button>
      <FormStatus state={state} />
    </form>
  );
}
