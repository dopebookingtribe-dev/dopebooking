"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, SelectField, TextareaField } from "@/components/ui/field";
import { fieldError, fieldValue } from "@/components/ui/form-helpers";
import { FormStatus } from "@/components/ui/form-status";
import { initialFormState, type FormState } from "@/lib/forms";
import type {
  ProductRow,
  ProductVariantRow,
} from "@/lib/supabase/database.types";
import { STATUSES } from "@/lib/validation";
import { centsToInput, PRODUCT_TYPES } from "../schemas";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function CreateProductForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  return (
    <form
      action={formAction}
      className="flex max-w-xl flex-col gap-6"
      noValidate
    >
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
          hint="You can add sizes or options next."
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

export function ProductDetailsForm({
  product,
  action,
}: {
  product: ProductRow;
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const value = (name: keyof ProductRow) =>
    fieldValue(state, name, product[name]);
  const error = (name: string) => fieldError(state, name);
  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          name="title"
          label="Product name"
          required
          defaultValue={value("title")}
          error={error("title")}
        />
        <Field
          name="slug"
          label="URL name"
          hint={`Shop page: /shop/${value("slug")}`}
          required
          defaultValue={value("slug")}
          error={error("slug")}
        />
      </div>
      <TextareaField
        name="description"
        label="Description"
        rows={8}
        hint="Materials, sizing, what's included, shipping time…"
        defaultValue={value("description")}
        error={error("description")}
      />
      <div className="grid gap-6 sm:grid-cols-2">
        <SelectField
          name="product_type"
          label="Type"
          defaultValue={value("product_type")}
        >
          {Object.entries(PRODUCT_TYPES).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </SelectField>
        <SelectField
          name="status"
          label="Status"
          hint="Published products appear in the shop."
          defaultValue={value("status")}
          error={error("status")}
        >
          {Object.entries(STATUSES).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save product"}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}

type Row = {
  key: number;
  id: string;
  name: string;
  sku: string;
  price: string;
  stock: string;
  active: boolean;
};

const inputClass =
  "min-h-11 w-full rounded-(--radius) border border-line-strong bg-surface-1 px-3 text-base text-text focus-visible:border-accent";

/** Options such as sizes or editions, each with its own price and stock. */
export function VariantsForm({
  variants,
  action,
}: {
  variants: ProductVariantRow[];
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const [rows, setRows] = useState<Row[]>(() =>
    variants.map((variant, index) => ({
      key: index,
      id: variant.id,
      name: variant.name,
      sku: variant.sku ?? "",
      price: centsToInput(variant.price_amount),
      stock: variant.stock === null ? "" : String(variant.stock),
      active: variant.active,
    })),
  );
  const update = (key: number, patch: Partial<Row>) =>
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  const nextKey = () => Math.max(-1, ...rows.map((row) => row.key)) + 1;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="hidden grid-cols-[1fr_7rem_6rem_7rem_5rem_auto] gap-2 px-3 font-mono text-[0.7rem] tracking-[0.12em] text-muted uppercase lg:grid">
        <span>Option</span>
        <span>Price €</span>
        <span>Stock</span>
        <span>SKU</span>
        <span>On sale</span>
        <span />
      </div>
      <ul className="flex flex-col gap-3">
        {rows.map((row, index) => (
          <li
            key={row.key}
            className="grid gap-2 rounded-(--radius) border border-line p-3 sm:grid-cols-2 lg:grid-cols-[1fr_7rem_6rem_7rem_5rem_auto] lg:items-center"
          >
            <input type="hidden" name="v.id" value={row.id} />
            <label className="sr-only" htmlFor={`v-name-${row.key}`}>
              Option {index + 1} name
            </label>
            <input
              id={`v-name-${row.key}`}
              name="v.name"
              placeholder="e.g. M / Black"
              value={row.name}
              onChange={(e) => update(row.key, { name: e.target.value })}
              className={inputClass}
            />
            <label className="sr-only" htmlFor={`v-price-${row.key}`}>
              Option {index + 1} price in euros
            </label>
            <input
              id={`v-price-${row.key}`}
              name="v.price"
              inputMode="decimal"
              placeholder="29.00"
              value={row.price}
              onChange={(e) => update(row.key, { price: e.target.value })}
              className={inputClass}
            />
            <label className="sr-only" htmlFor={`v-stock-${row.key}`}>
              Option {index + 1} stock (empty for unlimited)
            </label>
            <input
              id={`v-stock-${row.key}`}
              name="v.stock"
              inputMode="numeric"
              placeholder="∞"
              value={row.stock}
              onChange={(e) => update(row.key, { stock: e.target.value })}
              className={inputClass}
            />
            <label className="sr-only" htmlFor={`v-sku-${row.key}`}>
              Option {index + 1} SKU
            </label>
            <input
              id={`v-sku-${row.key}`}
              name="v.sku"
              placeholder="SKU"
              value={row.sku}
              onChange={(e) => update(row.key, { sku: e.target.value })}
              className={inputClass}
            />
            {/* Checkbox state travels as a parallel field so rows stay aligned. */}
            <input
              type="hidden"
              name="v.active"
              value={row.active ? "on" : ""}
            />
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={row.active}
                onChange={(e) => update(row.key, { active: e.target.checked })}
                className="size-4 accent-(--accent)"
              />
              <span className="lg:sr-only">On sale</span>
            </label>
            <Button
              variant="ghost"
              className="px-3"
              onClick={() =>
                setRows((current) => current.filter((r) => r.key !== row.key))
              }
              aria-label={`Remove option ${index + 1}`}
              disabled={rows.length === 1}
            >
              ✕
            </Button>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">
        Leave stock empty for unlimited (e.g. downloads). Prices include VAT
        where applicable.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <Button
          variant="secondary"
          onClick={() =>
            setRows((current) => [
              ...current,
              {
                key: nextKey(),
                id: "",
                name: "",
                sku: "",
                price: current.at(-1)?.price ?? "",
                stock: "",
                active: true,
              },
            ])
          }
        >
          Add option
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save options"}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
