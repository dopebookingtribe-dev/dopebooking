import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "text";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[color,background-color,border-color,transform] duration-300 ease-(--ease-spring) disabled:pointer-events-none disabled:opacity-50";

const sizes: Record<Size, string> = {
  md: "min-h-11 px-6 text-sm",
  lg: "min-h-13 px-8 text-base",
};

const variants: Record<Variant, string> = {
  // A small lean on hover, like a sticker being picked up.
  primary:
    "bg-accent text-accent-ink hover:-rotate-1 hover:scale-[1.04] active:scale-[0.98]",
  secondary:
    "border-[1.5px] border-line-strong bg-bg/50 text-text hover:border-uv hover:text-uv active:scale-[0.98]",
  ghost: "text-muted hover:text-text",
  text: "min-h-11 px-0! rounded-none! underline decoration-line-strong decoration-1 underline-offset-[6px] hover:text-uv hover:decoration-uv",
};

export function buttonClasses(
  variant: Variant = "primary",
  className = "",
  size: Size = "md",
) {
  return `${base} ${sizes[size]} ${variants[variant]} ${className}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return (
    <button
      type={type}
      className={buttonClasses(variant, className, size)}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return (
    <Link className={buttonClasses(variant, className, size)} {...props} />
  );
}
