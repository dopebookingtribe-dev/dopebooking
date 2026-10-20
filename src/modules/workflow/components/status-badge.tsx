import type { Tone } from "../types";

const tones: Record<Tone, string> = {
  neutral: "border-line-strong text-text",
  uv: "border-uv/60 text-uv",
  accent: "border-accent/60 text-accent",
  success: "border-success/60 text-success",
  danger: "border-danger/50 text-danger",
  muted: "border-line text-muted",
};

export function WorkflowBadge({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 font-mono text-[0.7rem] tracking-[0.12em] whitespace-nowrap uppercase ${tones[tone]}`}
    >
      {label}
    </span>
  );
}
