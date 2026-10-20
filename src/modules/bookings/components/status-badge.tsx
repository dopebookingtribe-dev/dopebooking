import type { BookingStatus } from "@/lib/supabase/database.types";
import { WorkflowBadge } from "@/modules/workflow/components/status-badge";
import { BOOKING_WORKFLOW } from "../schemas";

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <WorkflowBadge
      label={BOOKING_WORKFLOW.labels[status]}
      tone={BOOKING_WORKFLOW.tones[status]}
    />
  );
}
