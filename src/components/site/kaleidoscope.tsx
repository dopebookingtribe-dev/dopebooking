"use client";

import { useEffect, useRef } from "react";

/**
 * A live kaleidoscope made from one photo: the image is tiled into mirrored
 * wedges around a centre that slowly turns and follows the pointer (or a
 * finger dragging across it). It only animates while on screen, and stays
 * as a still mandala for visitors who prefer reduced motion.
 */
export function Kaleidoscope({
  src,
  segments = 10,
  centerX = 0.72,
  centerY = 0.42,
  className = "",
  open = false,
}: {
  src: string;
  segments?: number;
  /** Centre of the figure, as fractions of the canvas size. */
  centerX?: number;
  centerY?: number;
  className?: string;
  /** Play the lens-opening reveal when it first appears. */
  open?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const ctx = context;
    const view = canvas;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let pattern: CanvasPattern | null = null;
    let imageWidth = 0;
    let imageHeight = 0;
    let frame = 0;
    let visible = false;
    let time = 0;
    // Pointer target and eased position, 0..1 across the canvas.
    let px = 0.5;
    let py = 0.5;
    let ex = 0.5;
    let ey = 0.5;

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
      ctx.clearRect(0, 0, width, height);
      ctx.filter = "saturate(1.35) brightness(1.15)";
      for (let i = 0; i < segments; i++) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(i * wedge + time * 0.05);
        if (i % 2) ctx.scale(1, -1);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, 0, wedge + 0.01);
        ctx.closePath();
        ctx.clip();
        ctx.rotate(ex * 2 + time * 0.02);
        // Big canvases zoom into the photo so each wedge holds colour
        // rather than tiny repeats; small lenses show it at full size.
        const zoom = Math.max(1, (width / imageWidth) * 1.6);
        ctx.scale(zoom, zoom);
        // Sample around the middle of the photo, where the light usually is;
        // the pointer slides the sample window across it.
        ctx.translate(
          -imageWidth * (0.5 + (ex - 0.5) * 0.5) + Math.sin(time * 0.1) * 40,
          -imageHeight * (0.55 + (ey - 0.5) * 0.4),
        );
        ctx.fillStyle = pattern;
        ctx.fillRect(-radius * 2, -radius * 2, radius * 4, radius * 4);
        ctx.restore();
      }
    }

    const tick = () => {
      frame = 0;
      if (!visible || document.hidden) return;
      ex += (px - ex) * 0.04;
      ey += (py - ey) * 0.04;
      time += 0.016;
      draw();
      frame = requestAnimationFrame(tick);
    };
    const start = () => {
      if (!reduce && !frame && visible) frame = requestAnimationFrame(tick);
    };

    const onPointer = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      if (
        event.clientY < box.top ||
        event.clientY > box.bottom ||
        event.clientX < box.left ||
        event.clientX > box.right
      ) {
        return;
      }
      px = (event.clientX - box.left) / box.width;
      py = (event.clientY - box.top) / box.height;
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
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", start);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", start);
    };
  }, [src, segments, centerX, centerY]);

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
