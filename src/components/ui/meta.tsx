import type { ComponentProps } from "react";

/** Condensed metadata: dates, cities, places, references. Sentence case. */
export function Meta({ className = "", ...props }: ComponentProps<"p">) {
  return (
    <p className={`font-label text-sm text-muted ${className}`} {...props} />
  );
}
