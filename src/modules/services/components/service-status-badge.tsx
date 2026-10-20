import type { ServiceStatus } from "@/lib/supabase/database.types";
import { WorkflowBadge } from "@/modules/workflow/components/status-badge";
import { SERVICE_WORKFLOW } from "../schemas";

export function ServiceStatusBadge({ status }: { status: ServiceStatus }) {
  return (
    <WorkflowBadge
      label={SERVICE_WORKFLOW.labels[status]}
      tone={SERVICE_WORKFLOW.tones[status]}
    />
  );
}
