"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/field";
import { FormStatus } from "@/components/ui/form-status";
import { initialFormState, type FormState } from "@/lib/forms";

export function ProviderAssignForm({
  current,
  providers,
  action,
}: {
  current: string | null;
  providers: { id: string; name: string; active: boolean }[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <SelectField
        name="provider_id"
        label="Provider"
        defaultValue={current ?? ""}
      >
        <option value="">Not assigned</option>
        {providers.map((provider) => (
          <option key={provider.id} value={provider.id}>
            {provider.name}
            {provider.active ? "" : " (inactive)"}
          </option>
        ))}
      </SelectField>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
