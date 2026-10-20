"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { TextareaField } from "@/components/ui/field";
import { fieldError } from "@/components/ui/form-helpers";
import { FormStatus } from "@/components/ui/form-status";
import { initialFormState, type FormState } from "@/lib/forms";

export function MessageForm({
  action,
  allowInternal = false,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  allowInternal?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <TextareaField
        name="body"
        label={
          allowInternal ? "Message or note" : "Message to the booking team"
        }
        rows={4}
        // After a successful send the form resets to empty.
        defaultValue={
          state.status === "error" ? (state.values?.body as string) : ""
        }
        error={fieldError(state, "body")}
      />
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send"}
        </Button>
        {allowInternal ? (
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="internal"
              className="size-4 accent-(--uv)"
            />
            Internal note (staff only, no email)
          </label>
        ) : null}
        <FormStatus state={state} />
      </div>
    </form>
  );
}
