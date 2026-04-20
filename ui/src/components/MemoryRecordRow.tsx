import type { Agent, Issue, MemoryBinding, MemoryRecord, Project } from "@paperclipai/shared";
import type { KeyboardEvent } from "react";
import { Link } from "@/lib/router";
import { agentUrl, cn, issueUrl, projectUrl, relativeTime } from "../lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "./StatusBadge";

export function labelizeMemoryValue(value: string) {
  return value.replace(/_/g, " ");
}

export function summarizeMemoryRecord(record: MemoryRecord, maxLength = 360) {
  const text = (record.summary ?? record.content).replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

export function getMemoryRecordTitle(record: MemoryRecord) {
  return record.title ?? record.citation?.sourceTitle ?? labelizeMemoryValue(record.source?.kind ?? "memory");
}

export function memoryRecordSourceLabel(record: MemoryRecord, issuesById?: ReadonlyMap<string, Issue>) {
  const issueId = record.source?.issueId ?? record.scope.issueId ?? null;
  const issue = issueId ? issuesById?.get(issueId) : null;
  if (issue) return issue.identifier ?? issue.title;
  if (record.source?.runId ?? record.scope.runId) return `run ${(record.source?.runId ?? record.scope.runId)!.slice(0, 8)}`;
  if (record.source?.externalRef) return record.source.externalRef;
  return labelizeMemoryValue(record.source?.kind ?? record.scopeType);
}

export function memoryRecordSourceHref(record: MemoryRecord, issuesById?: ReadonlyMap<string, Issue>) {
  const issueId = record.source?.issueId ?? record.scope.issueId ?? null;
  const issue = issueId ? issuesById?.get(issueId) : null;
  if (issue) {
    const base = issueUrl(issue);
    if (record.source?.commentId) return `${base}#comment-${record.source.commentId}`;
    if (record.source?.documentKey) return `${base}#document-${record.source.documentKey}`;
    return base;
  }
  const runId = record.source?.runId ?? record.scope.runId ?? null;
  const agentId = record.scope.agentId ?? null;
  if (runId && agentId) return `/agents/${agentId}/runs/${runId}`;
  return null;
}

export function memoryRecordReviewStatus(record: MemoryRecord) {
  return record.revokedAt || record.retentionState === "revoked" ? "revoked" : record.reviewState;
}

export function MemoryRecordRow({
  record,
  binding,
  issuesById,
  agentsById,
  projectsById,
  onSelect,
  selected = false,
  onSelectedChange,
  variant = "feed",
}: {
  record: MemoryRecord;
  binding?: MemoryBinding | null;
  issuesById?: ReadonlyMap<string, Issue>;
  agentsById?: ReadonlyMap<string, Agent>;
  projectsById?: ReadonlyMap<string, Project>;
  onSelect?: () => void;
  selected?: boolean;
  onSelectedChange?: (checked: boolean) => void;
  variant?: "feed" | "compact";
}) {
  const sourceUrl = memoryRecordSourceHref(record, issuesById);
  const agent = record.scope.agentId ? agentsById?.get(record.scope.agentId) : null;
  const project = record.scope.projectId ? projectsById?.get(record.scope.projectId) : null;
  const bindingLabel = binding?.name ?? binding?.key ?? record.providerKey;
  const summaryLength = variant === "compact" ? 280 : 360;
  const handleRowKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onSelect || event.currentTarget !== event.target) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  };

  const content = (
    <>
      {onSelectedChange ? (
        <div
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelectedChange(checked === true)}
            aria-label={`Select ${getMemoryRecordTitle(record)}`}
          />
        </div>
      ) : null}
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={memoryRecordReviewStatus(record)} />
          <span className="text-sm font-medium">{getMemoryRecordTitle(record)}</span>
          <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] text-muted-foreground">
            {bindingLabel}
          </span>
        </div>
        <p className="text-sm leading-6 text-foreground/85">{summarizeMemoryRecord(record, summaryLength)}</p>
      </div>
      <div className="min-w-0 border-t border-border pt-3 text-xs text-muted-foreground md:border-l md:border-t-0 md:pl-4 md:pt-0">
        <div className="mb-1 text-xs font-medium text-muted-foreground md:hidden">Source</div>
        <div className="font-medium text-foreground">{memoryRecordSourceLabel(record, issuesById)}</div>
        <div>{labelizeMemoryValue(record.source?.kind ?? record.scopeType)}</div>
        {record.citation?.label || record.citation?.sourceTitle ? (
          <div className="mt-1 truncate">{record.citation.label ?? record.citation.sourceTitle}</div>
        ) : null}
        {sourceUrl ? (
          onSelect ? (
            <Link
              className="mt-1 inline-flex text-primary hover:underline"
              to={sourceUrl}
              onClick={(event) => event.stopPropagation()}
            >
              Open source
            </Link>
          ) : (
            <div className="mt-1 text-primary">Open source</div>
          )
        ) : null}
      </div>
      <div className="border-t border-border pt-3 text-xs text-muted-foreground md:border-l md:border-t-0 md:pl-4 md:pt-0 md:text-right">
        <div className="mb-1 text-xs font-medium text-muted-foreground md:hidden">Context</div>
        {project ? (
          onSelect ? (
            <div className="truncate">{project.name}</div>
          ) : (
            <Link className="block truncate text-primary hover:underline" to={projectUrl(project)}>
              {project.name}
            </Link>
          )
        ) : null}
        {agent ? (
          onSelect ? (
            <div className="truncate">{agent.name}</div>
          ) : (
            <Link className="block truncate text-primary hover:underline" to={agentUrl(agent)}>
              {agent.name}
            </Link>
          )
        ) : null}
        <div className="tabular-nums">{relativeTime(record.createdAt)}</div>
        <div>{record.sensitivityLabel}</div>
      </div>
    </>
  );

  const className = cn(
    "grid w-full gap-3 px-4 py-4 text-left",
    onSelectedChange
      ? variant === "compact"
        ? "md:grid-cols-[32px_1fr_190px_140px]"
        : "md:grid-cols-[32px_1fr_220px_160px]"
      : variant === "compact"
        ? "md:grid-cols-[1fr_190px_140px]"
        : "md:grid-cols-[1fr_220px_160px]",
    onSelect ? "transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" : null,
  );

  if (onSelect) {
    return (
      <div role="button" tabIndex={0} className={className} onClick={onSelect} onKeyDown={handleRowKeyDown}>
        {content}
      </div>
    );
  }

  return <div className={className}>{content}</div>;
}
