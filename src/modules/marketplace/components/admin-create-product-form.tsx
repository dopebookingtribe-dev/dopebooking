"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, SelectField } from "@/components/ui/field";
import { fieldError, fieldValue } from "@/components/ui/form-helpers";
import { FormStatus } from "@/components/ui/form-status";
import { initialFormState, type FormState } from "@/lib/forms";
import { PRODUCT_TYPES } from "../schemas";

export function AdminCreateProductForm({
  sellers,
  action,
}: {
  sellers: { id: string; display_name: string }[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form
      action={formAction}
      className="flex max-w-xl flex-col gap-6"
      noValidate
    >
      <SelectField
        name="seller_id"
        label="Shop"
        hint="Sales are paid out to this shop. Only approved shops are listed."
        defaultValue={fieldValue(state, "seller_id", sellers[0]?.id ?? "")}
        error={fieldError(state, "seller_id")}
      >
        {sellers.map((seller) => (
          <option key={seller.id} value={seller.id}>
            {seller.display_name}
          </option>
        ))}
      </SelectField>
      <Field
        name="title"
        label="Product name"
        required
        defaultValue={fieldValue(state, "title", null)}
        error={fieldError(state, "title")}
      />
      <div className="grid gap-6 sm:grid-cols-2">
        <SelectField
          name="product_type"
          label="Type"
          defaultValue={fieldValue(state, "product_type", "physical")}
        >
          {Object.entries(PRODUCT_TYPES).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </SelectField>
        <Field
          name="price"
          label="Price (EUR)"
          inputMode="decimal"
          placeholder="29.00"
          required
          hint="Add sizes or editions next."
          defaultValue={fieldValue(state, "price", null)}
          error={fieldError(state, "price")}
        />
      </div>
      <FormStatus state={state} />
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Creating…" : "Create draft"}
      </Button>
    </form>
  );
}
