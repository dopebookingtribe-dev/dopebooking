"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { fieldError, fieldValue } from "@/components/ui/form-helpers";
import { FormStatus } from "@/components/ui/form-status";
import { initialFormState, type FormState } from "@/lib/forms";
import { ARTIST_KINDS } from "../../schemas";

/** Create a draft: a couple of fields, optionally the profile type. */
export function CreateForm({
  action,
  fields,
  kinds = false,
  hidden = {},
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  fields: { name: string; label: string; hint?: string }[];
  kinds?: boolean;
  hidden?: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form
      action={formAction}
      className="flex max-w-xl flex-col gap-5"
      noValidate
    >
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {fields.map((field, i) => (
        <Field
          key={field.name}
          name={field.name}
          label={field.label}
          hint={field.hint}
          required={i === 0}
          autoComplete="off"
          defaultValue={fieldValue(state, field.name, null)}
          error={fieldError(state, field.name)}
        />
      ))}
      {kinds ? (
        <fieldset>
          <legend className="mb-3 text-sm font-medium">Profile type</legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ARTIST_KINDS).map(([key, label]) => (
              <label
                key={key}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line-strong px-4 text-sm has-checked:border-accent has-checked:text-accent"
              >
                <input
                  type="radio"
                  name="kind"
                  value={key}
                  defaultChecked={
                    (fieldValue(state, "kind", null) || "individual") === key
                  }
                  className="accent-(--accent)"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <FormStatus state={state} />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Creating…" : "Create draft"}
      </Button>
    </form>
  );
}
