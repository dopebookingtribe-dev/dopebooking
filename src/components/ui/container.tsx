import type { ComponentProps } from "react";

export function Container({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`mx-auto w-full max-w-7xl px-(--gutter) ${className}`}
      {...props}
    />
  );
}
