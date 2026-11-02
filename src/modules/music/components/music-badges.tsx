import type {
  MusicReleaseStatus,
  WithdrawalStatus,
} from "@/lib/supabase/database.types";
import { RELEASE_STATUSES, WITHDRAWAL_STATUSES } from "../schemas";

const releaseStyles: Record<MusicReleaseStatus, string> = {
  draft: "border-line-strong text-muted",
  in_review: "border-uv/60 text-uv",
  published: "border-success/50 text-success",
  rejected: "border-danger/60 text-danger",
  archived: "border-line text-muted",
};

const withdrawalStyles: Record<WithdrawalStatus, string> = {
  requested: "border-uv/60 text-uv",
  approved: "border-accent/60 text-accent",
  paid: "border-success/50 text-success",
  rejected: "border-danger/60 text-danger",
  cancelled: "border-line text-muted",
};

const badge =
  "inline-flex rounded-full border px-2.5 py-0.5 font-label text-xs whitespace-nowrap";

export function ReleaseStatusBadge({ status }: { status: MusicReleaseStatus }) {
  return (
    <span className={`${badge} ${releaseStyles[status]}`}>
      {RELEASE_STATUSES[status]}
    </span>
  );
}

export function WithdrawalStatusBadge({
  status,
}: {
  status: WithdrawalStatus;
}) {
  return (
    <span className={`${badge} ${withdrawalStyles[status]}`}>
      {WITHDRAWAL_STATUSES[status]}
    </span>
  );
}
