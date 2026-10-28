"use client";

import { useEffect, useRef } from "react";

/**
 * A live kaleidoscope made from one photo: the image is tiled into mirrored
 * wedges around a turning centre.
 *
 * - On first view it can spin up fast as the lens opens, then settle.
 * - It follows the pointer; a flick of the mouse or a finger drag adds spin
 *   with momentum, and a click or tap gives a burst with a zoom pulse.
 * - Scrolling past it zooms in and turns it further.
 * - With `spotlight`, it writes the pointer position to its parent as
 *   --spot-x / --spot-y / --spot so an overlay can draw a lens around it.
 *
 * It only animates while on screen, and stays as a still mandala for
 * visitors who prefer reduced motion.
 */
export function Kaleidoscope({
  src,
  segments = 10,
  centerX = 0.72,
  centerY = 0.42,
  className = "",
  open = false,
  spotlight = false,
}: {
  src: string;
  segments?: number;
  /** Centre of the figure, as fractions of the canvas size. */
  centerX?: number;
  centerY?: number;
  className?: string;
  /** Play the lens-opening reveal and spin-up when it first appears. */
  open?: boolean;
  /** Publish the pointer position to the parent for a lens overlay. */
  spotlight?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const ctx = context;
    const view = canvas;
    const host = canvas.parentElement;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const IDLE_SPIN = 0.0012;
    let width = 0;
    let height = 0;
    let pattern: CanvasPattern | null = null;
    let imageWidth = 0;
    let imageHeight = 0;
    let frame = 0;
    let visible = false;
    let time = 0;
    // Spin angle and angular velocity (radians per frame).
    let angle = 0;
    let spin = open && !reduce ? 0.09 : IDLE_SPIN;
    // Zoom pulse from clicks, and zoom from scrolling.
    let pulse = open && !reduce ? 0.5 : 0;
    let scrollProgress = 0;
    // Pointer target and eased position, 0..1 across the canvas.
    let px = 0.5;
    let py = 0.5;
    let ex = 0.5;
    let ey = 0.5;
    let lastX: number | null = null;
    let spot = 0;
    let spotTarget = 0;

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = canvas.width = Math.max(1, Math.round(box.width * ratio));
      height = canvas.height = Math.max(1, Math.round(box.height * ratio));
      draw();
    };

    function draw() {
      if (!pattern) return;
      // On narrow screens the figure sits at the top, above the text.
      const narrow = view.clientWidth < 640;
      const cx = width * (narrow ? 0.5 : centerX);
      const cy = height * (narrow ? 0.24 : centerY);
      const radius = Math.hypot(width, height);
      const wedge = (Math.PI * 2) / segments;
      const zoom =
        Math.max(1, (width / imageWidth) * 1.6) *
        (1 + pulse + scrollProgress * 0.9);
      ctx.clearRect(0, 0, width, height);
      ctx.filter = "saturate(1.55) brightness(1.2) contrast(1.05)";
      for (let i = 0; i < segments; i++) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(i * wedge + angle + scrollProgress * 1.4);
        if (i % 2) ctx.scale(1, -1);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, 0, wedge + 0.01);
        ctx.closePath();
        ctx.clip();
        ctx.rotate(ex * 2.4 + angle * 0.4);
        // Big canvases zoom into the photo so each wedge holds colour
        // rather than tiny repeats; small lenses show it at full size.
        ctx.scale(zoom, zoom);
        // Sample around the middle of the photo, where the light usually is;
        // the pointer slides the sample window across it.
        ctx.translate(
          -imageWidth * (0.5 + (ex - 0.5) * 0.6) + Math.sin(time * 0.1) * 40,
          -imageHeight * (0.55 + (ey - 0.5) * 0.5),
        );
        ctx.fillStyle = pattern;
        ctx.fillRect(-radius * 2, -radius * 2, radius * 4, radius * 4);
        ctx.restore();
      }
    }

    const publishSpot = (x: number, y: number) => {
      if (!spotlight || !host) return;
      host.style.setProperty("--spot-x", `${x}px`);
      host.style.setProperty("--spot-y", `${y}px`);
    };

    const tick = () => {
      frame = 0;
      if (!visible || document.hidden) return;
      ex += (px - ex) * 0.06;
      ey += (py - ey) * 0.06;
      spin += (IDLE_SPIN - spin) * 0.025;
      angle += spin;
      pulse *= 0.93;
      time += 0.016;
      const box = view.getBoundingClientRect();
      scrollProgress = Math.min(1, Math.max(0, -box.top / box.height));
      spot += (spotTarget - spot) * 0.12;
      if (spotlight && host) host.style.setProperty("--spot", spot.toFixed(3));
      draw();
      frame = requestAnimationFrame(tick);
    };
    const start = () => {
      if (!reduce && !frame && visible) frame = requestAnimationFrame(tick);
    };

    const inside = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      return (
        event.clientY >= box.top &&
        event.clientY <= box.bottom &&
        event.clientX >= box.left &&
        event.clientX <= box.right
      );
    };

    const onMove = (event: PointerEvent) => {
      if (!inside(event)) {
        spotTarget = 0;
        lastX = null;
        return;
      }
      const box = canvas.getBoundingClientRect();
      px = (event.clientX - box.left) / box.width;
      py = (event.clientY - box.top) / box.height;
      // A quick sideways flick (or finger drag) adds spin with momentum.
      if (lastX !== null) {
        const delta = event.clientX - lastX;
        spin = Math.max(-0.12, Math.min(0.12, spin + delta * 0.00012));
      }
      lastX = event.clientX;
      spotTarget = event.pointerType === "mouse" ? 1 : 0;
      publishSpot(event.clientX - box.left, event.clientY - box.top);
      start();
    };

    const onDown = (event: PointerEvent) => {
      if (!inside(event)) return;
      // Clicking links and buttons in the hero shouldn't spin it.
      if ((event.target as HTMLElement).closest("a, button, input, label")) {
        return;
      }
      const box = canvas.getBoundingClientRect();
      const side = event.clientX - box.left > box.width * centerX ? 1 : -1;
      spin = Math.max(-0.14, Math.min(0.14, spin + 0.08 * side));
      pulse = Math.min(0.6, pulse + 0.35);
      start();
    };

    const onLeave = () => {
      spotTarget = 0;
      lastX = null;
    };

    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      imageWidth = image.naturalWidth;
      imageHeight = image.naturalHeight;
      pattern = ctx.createPattern(image, "repeat");
      resize();
      start();
    };
    image.src = src;

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    });
    observer.observe(canvas);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    if (!reduce) {
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerdown", onDown, { passive: true });
      document.documentElement.addEventListener("pointerleave", onLeave);
    }
    document.addEventListener("visibilitychange", start);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", start);
    };
  }, [src, segments, centerX, centerY, open, spotlight]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`${open ? "lens-open" : ""} ${className}`}
      style={
        {
          "--lens-x": `${centerX * 100}%`,
          "--lens-y": `${centerY * 100}%`,
        } as React.CSSProperties
      }
    />
  );
}
