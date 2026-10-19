import { useId, type ComponentProps, type ReactNode } from "react";

const controlClass =
  "rounded-(--radius) border border-line-strong bg-surface-1 px-3 text-base text-text placeholder:text-muted focus-visible:border-accent aria-invalid:border-danger";

type FieldProps = { label: string; error?: string; hint?: string };

function FieldShell({
  label,
  error,
  hint,
  className = "",
  children,
}: FieldProps & {
  className?: string;
  children: (control: {
    id: string;
    "aria-invalid": true | undefined;
    "aria-describedby": string | undefined;
  }) => ReactNode;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })}
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

export function Field({
  label,
  error,
  hint,
  className,
  ...inputProps
}: ComponentProps<"input"> & FieldProps) {
  return (
    <FieldShell label={label} error={error} hint={hint} className={className}>
      {(control) => (
        <input
          {...control}
          className={`min-h-11 ${controlClass}`}
          {...inputProps}
        />
      )}
    </FieldShell>
  );
}

export function TextareaField({
  label,
  error,
  hint,
  className,
  ...textareaProps
}: ComponentProps<"textarea"> & FieldProps) {
  return (
    <FieldShell label={label} error={error} hint={hint} className={className}>
      {(control) => (
        <textarea
          {...control}
          className={`min-h-32 py-2 leading-relaxed ${controlClass}`}
          {...textareaProps}
        />
      )}
    </FieldShell>
  );
}

export function SelectField({
  label,
  error,
  hint,
  className,
  children,
  ...selectProps
}: ComponentProps<"select"> & FieldProps) {
  return (
    <FieldShell label={label} error={error} hint={hint} className={className}>
      {(control) => (
        <select
          {...control}
          className={`min-h-11 ${controlClass}`}
          {...selectProps}
        >
          {children}
        </select>
      )}
    </FieldShell>
  );
}
