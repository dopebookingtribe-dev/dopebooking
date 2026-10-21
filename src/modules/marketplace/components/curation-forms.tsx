"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, SelectField } from "@/components/ui/field";
import { FormStatus } from "@/components/ui/form-status";
import { initialFormState, type FormState } from "@/lib/forms";
import type {
  ContentStatus,
  ProductCategoryRow,
} from "@/lib/supabase/database.types";
import { STATUSES } from "@/lib/validation";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function CategoryForm({
  category,
  action,
}: {
  category?: ProductCategoryRow;
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const value = (name: string, fallback: string) =>
    (state.values?.[name] as string | undefined) ?? fallback;
  const error = (name: string) => state.fieldErrors?.[name]?.[0];
  return (
    <form
      action={formAction}
      className="grid gap-4 sm:grid-cols-[1fr_1fr_7rem]"
      noValidate
    >
      <Field
        name="name"
        label="Name"
        required
        defaultValue={value("name", category?.name ?? "")}
        error={error("name")}
      />
      <Field
        name="slug"
        label="URL name"
        hint="Empty: made from the name."
        defaultValue={value("slug", category?.slug ?? "")}
        error={error("slug")}
      />
      <Field
        name="sort_order"
        label="Order"
        type="number"
        inputMode="numeric"
        defaultValue={value("sort_order", String(category?.sort_order ?? 0))}
        error={error("sort_order")}
      />
      <Field
        name="description"
        label="Short description"
        className="sm:col-span-2"
        defaultValue={value("description", category?.description ?? "")}
        error={error("description")}
      />
      <label className="flex min-h-11 items-center gap-3 self-end text-sm">
        <input
          type="checkbox"
          name="visible"
          defaultChecked={
            state.values
              ? state.values.visible === "on"
              : (category?.visible ?? true)
          }
          className="size-4 accent-(--accent)"
        />
        Visible
      </label>
      <div className="flex items-center gap-4 sm:col-span-3">
        <Button
          type="submit"
          variant={category ? "secondary" : "primary"}
          disabled={pending}
        >
          {pending ? "Saving…" : category ? "Save" : "Add category"}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}

export function CurationForm({
  product,
  categories,
  action,
}: {
  product: {
    category_id: string | null;
    featured: boolean;
    sort_order: number;
    status: ContentStatus;
    seo_title: string | null;
    seo_description: string | null;
  };
  categories: { id: string; name: string }[];
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const value = (name: keyof typeof product) => {
    const submitted = state.values?.[name];
    if (submitted !== undefined) return String(submitted);
    const stored = product[name];
    return stored === null ? "" : String(stored);
  };
  return (
    <form
      action={formAction}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      noValidate
    >
      <SelectField
        name="category_id"
        label="Category"
        defaultValue={value("category_id")}
      >
        <option value="">No category</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </SelectField>
      <SelectField name="status" label="Status" defaultValue={value("status")}>
        {Object.entries(STATUSES).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </SelectField>
      <Field
        name="sort_order"
        label="Order"
        type="number"
        inputMode="numeric"
        defaultValue={value("sort_order")}
      />
      <label className="flex min-h-11 items-center gap-3 self-end text-sm">
        <input
          type="checkbox"
          name="featured"
          defaultChecked={
            state.values ? state.values.featured === "on" : product.featured
          }
          className="size-4 accent-(--accent)"
        />
        Featured
      </label>
      <Field
        name="seo_title"
        label="Search title"
        maxLength={70}
        className="sm:col-span-2"
        defaultValue={value("seo_title")}
      />
      <Field
        name="seo_description"
        label="Search description"
        maxLength={200}
        className="sm:col-span-2"
        defaultValue={value("seo_description")}
      />
      <div className="flex items-center gap-4 sm:col-span-2 lg:col-span-4">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <FormStatus state={state} />
      </div>
    </form>
  );
}
