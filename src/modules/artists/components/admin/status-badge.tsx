import type { ContentStatus } from "@/lib/supabase/database.types";
import { STATUSES } from "../../schemas";

const styles: Record<ContentStatus, string> = {
  draft: "border-line-strong text-muted",
  published: "border-success/50 text-success",
  archived: "border-line text-muted line-through",
};

export function StatusBadge({ status }: { status: ContentStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 font-mono text-[0.7rem] tracking-[0.12em] uppercase ${styles[status]}`}
    >
      {STATUSES[status]}
    </span>
  );
}
