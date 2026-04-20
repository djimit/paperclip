import { cn } from "../lib/utils";
import { statusBadge, statusBadgeDefault } from "../lib/status-colors";

const statusBadgeVisualStatus: Record<string, string> = {
  pending: "idle",
  accepted: "approved",
  rejected: "rejected",
  revoked: "archived",
};

export function StatusBadge({ status }: { status: string }) {
  const visualStatus = statusBadgeVisualStatus[status] ?? status;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap shrink-0",
        statusBadge[visualStatus] ?? statusBadgeDefault
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}
