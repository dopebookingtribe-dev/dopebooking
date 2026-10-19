import { z } from "zod";

export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  values?: Record<string, string | string[]>;
};

export const initialFormState: FormState = { status: "idle" };

export function fieldErrorsOf(error: z.ZodError) {
  return z.flattenError(error).fieldErrors as Record<
    string,
    string[] | undefined
  >;
}

/** Submitted values, kept so a form can be re-filled after an error. */
export function formValues(formData: FormData, multi: string[] = []) {
  const values: Record<string, string | string[]> = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$ACTION")) continue;
    values[key] = multi.includes(key)
      ? formData.getAll(key).map(String)
      : String(formData.get(key) ?? "");
  }
  return values;
}

export function invalidForm(
  error: z.ZodError,
  formData: FormData,
  multi?: string[],
): FormState {
  return {
    status: "error",
    fieldErrors: fieldErrorsOf(error),
    values: formValues(formData, multi),
  };
}

export function failedForm(formData: FormData, multi?: string[]): FormState {
  return {
    status: "error",
    message: "Saving failed. Please try again.",
    values: formValues(formData, multi),
  };
}

export function slugTakenForm(formData: FormData, multi?: string[]): FormState {
  return {
    status: "error",
    fieldErrors: { slug: ["Another entry already uses this URL."] },
    values: formValues(formData, multi),
  };
}

export function savedForm(formData: FormData, multi?: string[]): FormState {
  return {
    status: "success",
    message: "Saved.",
    values: formValues(formData, multi),
  };
}
