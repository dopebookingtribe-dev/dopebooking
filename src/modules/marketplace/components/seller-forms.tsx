"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, SelectField, TextareaField } from "@/components/ui/field";
import { fieldError, fieldValue } from "@/components/ui/form-helpers";
import { FormStatus } from "@/components/ui/form-status";
import { initialFormState, type FormState } from "@/lib/forms";
import type { SellerRow, SellerStatus } from "@/lib/supabase/database.types";
import { SELLER_STATUS_LABELS } from "../schemas";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;
type Countries = { code: string; name: string }[];

function ProfileFields({
  state,
  seller,
  countries,
}: {
  state: FormState;
  seller: SellerRow | null;
  countries: Countries;
}) {
  const value = (name: keyof SellerRow) =>
    fieldValue(state, name, seller?.[name]);
  const error = (name: string) => fieldError(state, name);
  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          name="display_name"
          label="Shop name"
          required
          defaultValue={value("display_name")}
          error={error("display_name")}
        />
        <SelectField
          name="country"
          label="Based in"
          defaultValue={value("country")}
          error={error("country")}
        >
          <option value="">Choose…</option>
          {countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </SelectField>
      </div>
      <Field
        name="website"
        label="Website or Instagram (optional)"
        type="url"
        placeholder="https://"
        defaultValue={value("website")}
        error={error("website")}
      />
      <TextareaField
        name="bio"
        label="About your shop (public)"
        rows={4}
        defaultValue={value("bio")}
        error={error("bio")}
      />
    </>
  );
}

export function SellerApplicationForm({
  action,
  countries,
}: {
  action: Action;
  countries: Countries;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <ProfileFields state={state} seller={null} countries={countries} />
      <TextareaField
        name="application_note"
        label="What will you sell? (for our team)"
        rows={5}
        hint="Products, how you make or source them, and links to past work. At least 20 characters."
        defaultValue={fieldValue(state, "application_note", null)}
        error={fieldError(state, "application_note")}
      />
      <div className="flex flex-col gap-3">
        <FormStatus state={state} />
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Sending…" : "Apply to sell"}
        </Button>
      </div>
    </form>
  );
}

export function SellerProfileForm({
  action,
  seller,
  countries,
}: {
  action: Action;
  seller: SellerRow;
  countries: Countries;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <ProfileFields state={state} seller={seller} countries={countries} />
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save shop profile"}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}

export function ReviewSellerForm({
  action,
  current,
  commissionBps,
}: {
  action: Action;
  current: SellerStatus;
  commissionBps: number | null;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          name="status"
          label="Decision"
          defaultValue={current === "pending" ? "approved" : current}
        >
          {(Object.keys(SELLER_STATUS_LABELS) as SellerStatus[]).map(
            (status) => (
              <option key={status} value={status}>
                {SELLER_STATUS_LABELS[status]}
              </option>
            ),
          )}
        </SelectField>
        <Field
          name="commission_percent"
          label="Commission (%)"
          inputMode="decimal"
          hint="Used when payments go live. Leave empty to keep."
          defaultValue={
            commissionBps === null ? "" : String(commissionBps / 100)
          }
          error={fieldError(state, "commission_percent")}
        />
      </div>
      <TextareaField
        name="note"
        label="Message to the seller (optional)"
        rows={3}
        hint="Included in their notification."
      />
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save decision"}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
