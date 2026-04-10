import type { ActivityEvent } from "@paperclipai/shared";
import { IssueReferencePill } from "./IssueReferencePill";

type ActivityIssueReference = {
  id: string;
  identifier?: string | null;
  title?: string | null;
};

function readIssueReferences(details: Record<string, unknown> | null | undefined, key: string): ActivityIssueReference[] {
  const value = details?.[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ActivityIssueReference => !!item && typeof item === "object");
}

function Section({ label, items }: { label: string; items: ActivityIssueReference[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      {items.map((issue) => (
        <IssueReferencePill
          key={`${label}:${issue.id}`}
          issue={{
            id: issue.id,
            identifier: issue.identifier ?? null,
            title: issue.title ?? issue.identifier ?? issue.id,
          }}
        />
      ))}
    </div>
  );
}

export function IssueReferenceActivitySummary({ event }: { event: Pick<ActivityEvent, "details"> }) {
  const added = readIssueReferences(event.details, "addedReferencedIssues");
  const removed = readIssueReferences(event.details, "removedReferencedIssues");
  if (added.length === 0 && removed.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      <Section label="Added" items={added} />
      <Section label="Removed" items={removed} />
    </div>
  );
}
