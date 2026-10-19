import type { ComponentProps } from "react";

/** Mono "festival ticket" metadata: dates, cities, BPM, labels. */
export function Meta({ className = "", ...props }: ComponentProps<"p">) {
  return (
    <p
      className={`font-mono text-xs tracking-[0.18em] text-muted uppercase ${className}`}
      {...props}
    />
  );
}
