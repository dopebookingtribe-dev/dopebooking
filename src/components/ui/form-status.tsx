import type { FormState } from "@/lib/forms";

/** Announces the result of a form action to screen readers and sighted users. */
export function FormStatus({ state }: { state: FormState }) {
  if (!state.message) return null;
  return state.status === "error" ? (
    <p role="alert" className="text-sm text-danger">
      {state.message}
    </p>
  ) : (
    <p role="status" className="text-sm text-success">
      {state.message}
    </p>
  );
}
