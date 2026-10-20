import type { BookingStatus } from "@/lib/supabase/database.types";
import { STATUS_LABELS } from "../schemas";

const tones: Record<BookingStatus, string> = {
  submitted: "border-line-strong text-text",
  under_review: "border-uv/60 text-uv",
  quoted: "border-accent/60 text-accent",
  negotiating: "border-accent/60 text-accent",
  confirmed: "border-success/60 text-success",
  completed: "border-line text-muted",
  declined: "border-danger/50 text-danger",
  cancelled: "border-line text-muted",
  expired: "border-line text-muted",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 font-mono text-[0.7rem] tracking-[0.12em] whitespace-nowrap uppercase ${tones[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
