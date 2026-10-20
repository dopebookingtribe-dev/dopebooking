import type { SellerStatus } from "@/lib/supabase/database.types";
import { WorkflowBadge } from "@/modules/workflow/components/status-badge";
import type { Tone } from "@/modules/workflow/types";
import { SELLER_STATUS_LABELS } from "../schemas";

const tones: Record<SellerStatus, Tone> = {
  pending: "uv",
  approved: "success",
  rejected: "danger",
  suspended: "muted",
};

export function SellerStatusBadge({ status }: { status: SellerStatus }) {
  return (
    <WorkflowBadge label={SELLER_STATUS_LABELS[status]} tone={tones[status]} />
  );
}
