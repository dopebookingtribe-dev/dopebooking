"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

/**
 * A Tilt Warp heading whose letters turn in 3D toward the pointer (the
 * font's XROT/YROT axes). Eases back to rest when the pointer leaves the
 * area; stays still for reduced motion and on touch-only screens.
 */
export function TiltHeading({
  as: Tag = "h1",
  className = "",
  strength = 34,
  children,
}: {
  as?: ElementType;
  className?: string;
  /** Maximum turn in degrees (the font allows up to 45). */
  strength?: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !matchMedia("(hover: hover)").matches
    ) {
      return;
    }

    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let frame = 0;

    const animate = () => {
      x += (targetX - x) * 0.08;
      y += (targetY - y) * 0.08;
      element.style.setProperty("--tilt-x", (-y * strength).toFixed(1));
      element.style.setProperty("--tilt-y", (x * strength).toFixed(1));
      frame =
        Math.abs(targetX - x) + Math.abs(targetY - y) > 0.002
          ? requestAnimationFrame(animate)
          : 0;
    };
    const kick = () => {
      if (!frame) frame = requestAnimationFrame(animate);
    };

    const onMove = (event: PointerEvent) => {
      const box = element.getBoundingClientRect();
      // React within a generous zone around the heading only.
      const near =
        event.clientY > box.top - 300 &&
        event.clientY < box.bottom + 300 &&
        box.bottom > 0 &&
        box.top < window.innerHeight;
      if (!near) {
        targetX = targetY = 0;
      } else {
        const clamp = (value: number) => Math.max(-1, Math.min(1, value));
        targetX = clamp(
          (event.clientX - (box.left + box.width / 2)) / (box.width / 2),
        );
        targetY = clamp(
          (event.clientY - (box.top + box.height / 2)) /
            Math.max(box.height, 200),
        );
      }
      kick();
    };
    const onLeave = () => {
      targetX = targetY = 0;
      kick();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [strength]);

  return (
    <Tag ref={ref} className={`tilt-heading font-display ${className}`}>
      {children}
    </Tag>
  );
}
