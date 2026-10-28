"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

const clamp = (value: number) => Math.max(-1, Math.min(1, value));

/**
 * A Tilt Warp heading that turns in 3D toward the pointer (the font's
 * XROT/YROT axes).
 *
 * With `letters`, each letter swings in on load and then turns toward the
 * pointer on its own; letters close to it grow and glow saffron, as if seen
 * through a lens. Screen readers get the plain text. Everything stays still
 * for reduced motion, and pointer effects need a hovering mouse.
 */
export function TiltHeading({
  as: Tag = "h1",
  className = "",
  strength = 34,
  letters = false,
  children,
}: {
  as?: ElementType;
  className?: string;
  /** Maximum turn in degrees (the font allows up to 45). */
  strength?: number;
  /** Animate letter by letter. Needs plain text children. */
  letters?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const text = typeof children === "string" ? children : null;
  const split = letters && text !== null;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !matchMedia("(hover: hover)").matches
    ) {
      return;
    }

    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    let active = false;

    // Whole-heading mode: one tilt for the element.
    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;

    // Letter mode: per-letter centres (page coordinates) and eased values.
    const nodes = split
      ? Array.from(element.querySelectorAll<HTMLElement>("[data-letter]"))
      : [];
    let centres: { x: number; y: number }[] = [];
    const state = nodes.map(() => ({ tx: 0, ty: 0, near: 0 }));
    const measure = () => {
      centres = nodes.map((node) => {
        const box = node.getBoundingClientRect();
        return {
          x: box.left + box.width / 2 + window.scrollX,
          y: box.top + box.height / 2 + window.scrollY,
        };
      });
    };

    const animate = () => {
      frame = 0;
      let moving = false;
      if (split) {
        nodes.forEach((node, index) => {
          const centre = centres[index];
          const s = state[index];
          let goalX = 0;
          let goalY = 0;
          let goalNear = 0;
          if (active && centre) {
            const dx = pointerX - centre.x;
            const dy = pointerY - centre.y;
            goalY = clamp(dx / 260) * strength;
            goalX = clamp(-dy / 260) * strength;
            goalNear = Math.max(0, 1 - Math.hypot(dx, dy) / 200);
          }
          s.tx += (goalX - s.tx) * 0.14;
          s.ty += (goalY - s.ty) * 0.14;
          s.near += (goalNear - s.near) * 0.18;
          node.style.setProperty("--tilt-x", s.tx.toFixed(1));
          node.style.setProperty("--tilt-y", s.ty.toFixed(1));
          node.style.setProperty("--near", s.near.toFixed(3));
          if (
            Math.abs(goalX - s.tx) + Math.abs(goalY - s.ty) > 0.05 ||
            Math.abs(goalNear - s.near) > 0.002
          ) {
            moving = true;
          }
        });
      } else {
        x += (targetX - x) * 0.08;
        y += (targetY - y) * 0.08;
        element.style.setProperty("--tilt-x", (-y * strength).toFixed(1));
        element.style.setProperty("--tilt-y", (x * strength).toFixed(1));
        moving = Math.abs(targetX - x) + Math.abs(targetY - y) > 0.002;
      }
      if (moving) frame = requestAnimationFrame(animate);
    };
    const kick = () => {
      if (!frame) frame = requestAnimationFrame(animate);
    };

    const onMove = (event: PointerEvent) => {
      const box = element.getBoundingClientRect();
      // React within a generous zone around the heading only.
      active =
        event.clientY > box.top - 320 &&
        event.clientY < box.bottom + 320 &&
        box.bottom > 0 &&
        box.top < window.innerHeight;
      pointerX = event.clientX + window.scrollX;
      pointerY = event.clientY + window.scrollY;
      if (!split) {
        targetX = active
          ? clamp(
              (event.clientX - (box.left + box.width / 2)) / (box.width / 2),
            )
          : 0;
        targetY = active
          ? clamp(
              (event.clientY - (box.top + box.height / 2)) /
                Math.max(box.height, 200),
            )
          : 0;
      }
      kick();
    };
    const onLeave = () => {
      active = false;
      targetX = targetY = 0;
      kick();
    };

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(element);
    // Letters settle after their entrance; measure again once they have.
    const settle = window.setTimeout(measure, 1800);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [strength, split]);

  if (!split || text === null) {
    return (
      <Tag ref={ref} className={`tilt-heading font-display ${className}`}>
        {children}
      </Tag>
    );
  }

  let index = 0;
  const words = text.split(" ");
  return (
    <Tag ref={ref} className={`tilt-heading font-display ${className}`}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {words.map((word, wordIndex) => (
          <span key={wordIndex}>
            <span className="inline-block whitespace-nowrap">
              {Array.from(word).map((letter) => {
                const i = index++;
                return (
                  <span
                    key={i}
                    data-letter
                    className="hero-letter"
                    style={{ "--i": i } as React.CSSProperties}
                  >
                    {letter}
                  </span>
                );
              })}
            </span>
            {wordIndex < words.length - 1 ? " " : null}
          </span>
        ))}
      </span>
    </Tag>
  );
}
