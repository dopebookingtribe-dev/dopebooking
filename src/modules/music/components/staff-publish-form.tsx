"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormStatus } from "@/components/ui/form-status";
import { initialFormState, type FormState } from "@/lib/forms";

/** "Publish now" for releases DopeBooking uploads itself. */
export function StaffPublishForm({
  checklist,
  action,
}: {
  checklist: { label: string; done: boolean }[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <ul className="flex flex-col gap-1 text-sm">
        {checklist.map((item) => (
          <li
            key={item.label}
            className={item.done ? "text-success" : "text-muted"}
          >
            {item.done ? "✓" : "○"} {item.label}
          </li>
        ))}
      </ul>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="rights"
          className="mt-1 size-4 accent-(--accent)"
        />
        <span>
          DopeBooking holds the rights to sell this music and its artwork on the
          artist&apos;s behalf.
        </span>
      </label>
      {state.fieldErrors?.rights ? (
        <p className="text-sm text-danger">{state.fieldErrors.rights[0]}</p>
      ) : null}
      <FormStatus state={state} />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Publishing…" : "Publish now"}
      </Button>
    </form>
  );
}
