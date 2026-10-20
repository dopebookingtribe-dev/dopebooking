"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, TextareaField } from "@/components/ui/field";
import { fieldError, fieldValue } from "@/components/ui/form-helpers";
import { FormStatus } from "@/components/ui/form-status";
import { initialFormState, type FormState } from "@/lib/forms";
import type {
  ServiceProviderRow,
  ServiceType,
} from "@/lib/supabase/database.types";
import { SERVICE_LABELS } from "../schemas";

export function ProviderForm({
  provider,
  action,
}: {
  provider: ServiceProviderRow | null;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const value = (name: keyof ServiceProviderRow) =>
    fieldValue(state, name, provider?.[name]);
  const error = (name: string) => fieldError(state, name);
  const services =
    (state.values?.services as string[] | undefined) ??
    provider?.services ??
    [];
  const active = state.values
    ? state.values.active === "on"
    : (provider?.active ?? true);

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          name="name"
          label="Name"
          required
          defaultValue={value("name")}
          error={error("name")}
        />
        <Field
          name="contact_name"
          label="Contact person"
          defaultValue={value("contact_name")}
          error={error("contact_name")}
        />
      </div>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-sm font-medium">Services</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SERVICE_LABELS) as ServiceType[]).map((type) => (
            <label
              key={type}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line-strong px-4 text-sm has-checked:border-accent has-checked:text-accent"
            >
              <input
                type="checkbox"
                name="services"
                value={type}
                defaultChecked={services.includes(type)}
                className="accent-(--accent)"
              />
              {SERVICE_LABELS[type]}
            </label>
          ))}
        </div>
        {error("services") ? (
          <p className="text-sm text-danger">{error("services")}</p>
        ) : null}
      </fieldset>
      <div className="grid gap-6 sm:grid-cols-3">
        <Field
          name="email"
          label="Email"
          type="email"
          defaultValue={value("email")}
          error={error("email")}
        />
        <Field
          name="phone"
          label="Phone"
          type="tel"
          defaultValue={value("phone")}
          error={error("phone")}
        />
        <Field
          name="website"
          label="Website"
          type="url"
          placeholder="https://"
          defaultValue={value("website")}
          error={error("website")}
        />
      </div>
      <Field
        name="regions"
        label="Regions covered"
        hint="e.g. “Portugal, Spain, South of France”"
        defaultValue={value("regions")}
        error={error("regions")}
      />
      <TextareaField
        name="notes"
        label="Internal notes"
        rows={4}
        defaultValue={value("notes")}
        error={error("notes")}
      />
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          name="active"
          defaultChecked={active}
          className="size-4 accent-(--accent)"
        />
        Active (offered for new requests)
      </label>
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : provider ? "Save provider" : "Add provider"}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
