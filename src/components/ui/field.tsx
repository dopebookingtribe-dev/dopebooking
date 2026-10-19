import { useId, type ComponentProps } from "react";

export function Field({
  label,
  error,
  hint,
  className = "",
  ...inputProps
}: ComponentProps<"input"> & {
  label: string;
  error?: string;
  hint?: string;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="min-h-11 rounded-(--radius) border border-line-strong bg-surface-1 px-3 text-base text-text placeholder:text-muted focus-visible:border-accent aria-invalid:border-danger"
        {...inputProps}
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
