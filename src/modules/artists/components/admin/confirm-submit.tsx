"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

/** Submit button that asks for confirmation before a destructive action. */
export function ConfirmSubmit({
  message,
  children,
  ...props
}: ComponentProps<"button"> & { message: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
      {...props}
    >
      {pending ? "Working…" : children}
    </button>
  );
}
