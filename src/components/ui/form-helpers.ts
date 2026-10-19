import type { FormState } from "@/lib/forms";

/**
 * Value for an uncontrolled input: what was just submitted (so nothing is
 * lost after an error), else the stored value, else "".
 */
export function fieldValue(
  state: FormState,
  name: string,
  stored: unknown,
  fallback = "",
): string {
  const submitted = state.values?.[name];
  if (typeof submitted === "string") return submitted;
  return stored === null || stored === undefined ? fallback : String(stored);
}

export function fieldError(state: FormState, name: string) {
  return state.fieldErrors?.[name]?.[0];
}
