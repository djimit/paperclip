import type { PipelineCaseEvent } from "../api/pipelines";

export type LearningEventPresentation = {
  sentence: string;
  kind: "review" | "forced_move" | "unknown";
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function eventItemTitle(event: PipelineCaseEvent): string {
  const payload = asRecord(event.payload);
  return (
    event.caseTitle ??
    asString(payload.itemTitle) ??
    asString(payload.caseTitle) ??
    asString(payload.title) ??
    "Untitled item"
  );
}

function eventActorName(event: PipelineCaseEvent): string {
  const payload = asRecord(event.payload);
  return (
    asString(payload.actorName) ??
    asString(payload.reviewerName) ??
    asString(payload.decidedByName) ??
    "Someone"
  );
}

function payloadText(event: PipelineCaseEvent, ...keys: string[]): string | null {
  const payload = asRecord(event.payload);
  for (const key of keys) {
    const value = asString(payload[key]);
    if (value) return value;
  }
  return null;
}

function reviewVerb(decision: string | null): string {
  if (decision === "request_changes") return "sent back";
  if (decision === "drop") return "dropped";
  return "approved";
}

export function formatLearningEvent(event: PipelineCaseEvent): LearningEventPresentation {
  const payload = asRecord(event.payload);
  const title = eventItemTitle(event);

  if (event.kind === "review_decided" || event.kind === "case.reviewed") {
    const actor = eventActorName(event);
    const decision = asString(payload.decision);
    const toStageName = event.toStageName ?? payloadText(event, "toStageName", "stageName", "targetStageName");
    const stageCopy = toStageName ? ` moving to ${toStageName}` : "";
    const note = payloadText(event, "reason", "note");
    const noteCopy = note ? ` - note: ${note}` : "";
    return {
      kind: "review",
      sentence: `${actor} ${reviewVerb(decision)} '${title}'${stageCopy}${noteCopy}.`,
    };
  }

  if (event.kind === "transition_forced" || event.kind === "case.transitioned") {
    const fromStageName = event.fromStageName ?? payloadText(event, "fromStageName");
    const toStageName = event.toStageName ?? payloadText(event, "toStageName", "stageName", "targetStageName");
    const fromCopy = fromStageName ? ` from ${fromStageName}` : "";
    const toCopy = toStageName ? ` to ${toStageName}` : "";
    const reason = payloadText(event, "reason", "note");
    const reasonCopy = reason ? ` - reason: ${reason}` : "";
    return {
      kind: "forced_move",
      sentence: `'${title}' was moved by hand${fromCopy}${toCopy}${reasonCopy}.`,
    };
  }

  return {
    kind: "unknown",
    sentence: `'${title}' changed.`,
  };
}
