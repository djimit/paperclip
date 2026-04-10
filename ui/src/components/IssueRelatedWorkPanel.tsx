import type { IssueRelatedWorkItem, IssueRelatedWorkSummary } from "@paperclipai/shared";
import { IssueReferencePill } from "./IssueReferencePill";

function Section({
  title,
  description,
  items,
  emptyLabel,
}: {
  title: string;
  description: string;
  items: IssueRelatedWorkItem[];
  emptyLabel: string;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-border p-3">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.issue.id} className="space-y-2 rounded-md border border-border/60 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <IssueReferencePill issue={item.issue} />
                {item.issue.identifier !== item.issue.title ? (
                  <span className="text-sm text-muted-foreground">{item.issue.title}</span>
                ) : null}
                <span className="ml-auto text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {item.mentionCount} source{item.mentionCount === 1 ? "" : "s"}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {item.sources.map((source) => (
                  <span
                    key={`${item.issue.id}:${source.kind}:${source.sourceRecordId ?? "root"}`}
                    className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
                    title={source.matchedText ?? undefined}
                  >
                    {source.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function IssueRelatedWorkPanel({
  relatedWork,
}: {
  relatedWork?: IssueRelatedWorkSummary | null;
}) {
  const outbound = relatedWork?.outbound ?? [];
  const inbound = relatedWork?.inbound ?? [];

  return (
    <div className="space-y-3">
      <Section
        title="References"
        description="Other tasks this issue currently points at in its title, description, comments, or documents."
        items={outbound}
        emptyLabel="This issue does not reference any other tasks yet."
      />
      <Section
        title="Referenced by"
        description="Other tasks that currently point at this issue."
        items={inbound}
        emptyLabel="No other tasks reference this issue yet."
      />
    </div>
  );
}
