"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormStatus } from "@/components/ui/form-status";
import { initialFormState } from "@/lib/forms";
import { createArtist } from "../../actions";

export function CreateArtistForm() {
  const [state, action, pending] = useActionState(
    createArtist,
    initialFormState,
  );
  const value = (name: string) => state.values?.[name] as string | undefined;

  return (
    <form action={action} className="flex max-w-xl flex-col gap-5" noValidate>
      <Field
        name="stage_name"
        label="Stage name"
        required
        autoComplete="off"
        defaultValue={value("stage_name")}
        error={state.fieldErrors?.stage_name?.[0]}
      />
      <Field
        name="slug"
        label="URL name (optional)"
        hint="Leave empty to generate it from the stage name, e.g. vini-vici."
        autoComplete="off"
        defaultValue={value("slug")}
        error={state.fieldErrors?.slug?.[0]}
      />
      <FormStatus state={state} />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Creating…" : "Create draft"}
      </Button>
    </form>
  );
}
