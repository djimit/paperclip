// @vitest-environment node

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StatusIcon } from "./StatusIcon";

describe("StatusIcon", () => {
  it("renders covered blocked issues with the cyan covered state visual", () => {
    const html = renderToStaticMarkup(
      <StatusIcon
        status="blocked"
        blockerAttention={{
          state: "covered",
          reason: "active_child",
          unresolvedBlockerCount: 1,
          coveredBlockerCount: 1,
          stalledBlockerCount: 0,
          attentionBlockerCount: 0,
          sampleBlockerIdentifier: "PAP-2",
          sampleStalledBlockerIdentifier: null,
          nextActionOwner: null,
          nextActionHint: null,
        }}
      />,
    );

    expect(html).toContain('data-blocker-attention-state="covered"');
    expect(html).toContain('aria-label="Blocked · waiting on active sub-issue PAP-2"');
    expect(html).toContain('title="Blocked · waiting on active sub-issue PAP-2"');
    expect(html).toContain("border-cyan-600");
    expect(html).not.toContain("border-red-600");
    expect(html).not.toContain("border-dashed");
    expect(html).toContain("-bottom-0.5");
  });

  it("uses covered blocked copy for the active dependency count matrix", () => {
    const html = renderToStaticMarkup(
      <StatusIcon
        status="blocked"
        blockerAttention={{
          state: "covered",
          reason: "active_dependency",
          unresolvedBlockerCount: 2,
          coveredBlockerCount: 2,
          stalledBlockerCount: 0,
          attentionBlockerCount: 0,
          sampleBlockerIdentifier: null,
          sampleStalledBlockerIdentifier: null,
          nextActionOwner: null,
          nextActionHint: null,
        }}
      />,
    );

    expect(html).toContain('aria-label="Blocked · covered by 2 active dependencies"');
    expect(html).toContain("border-cyan-600");
    expect(html).not.toContain("border-dashed");
  });

  it("keeps normal blocked issues on the attention-required visual", () => {
    const html = renderToStaticMarkup(
      <StatusIcon
        status="blocked"
        blockerAttention={{
          state: "needs_attention",
          reason: "attention_required",
          unresolvedBlockerCount: 1,
          coveredBlockerCount: 0,
          stalledBlockerCount: 0,
          attentionBlockerCount: 1,
          sampleBlockerIdentifier: "PAP-2",
          sampleStalledBlockerIdentifier: null,
          nextActionOwner: null,
          nextActionHint: null,
        }}
      />,
    );

    expect(html).not.toContain('data-blocker-attention-state="covered"');
    expect(html).toContain('aria-label="Blocked · 1 unresolved blocker needs attention"');
    expect(html).toContain("border-red-600");
    expect(html).not.toContain("border-dashed");
  });

  it("renders recovery_needed leaves with the alert overlay and liveness-break tooltip", () => {
    const html = renderToStaticMarkup(
      <StatusIcon
        status="blocked"
        blockerAttention={{
          state: "recovery_needed",
          reason: "productive_run_stopped",
          unresolvedBlockerCount: 1,
          coveredBlockerCount: 0,
          stalledBlockerCount: 0,
          attentionBlockerCount: 0,
          sampleBlockerIdentifier: "PAP-2642",
          sampleStalledBlockerIdentifier: null,
          nextActionOwner: { type: "agent", agentId: "agent-1", userId: null },
          nextActionHint: "wake_to_continue",
        }}
      />,
    );

    expect(html).toContain('data-blocker-attention-state="recovery_needed"');
    expect(html).toContain('aria-label="Blocked · liveness break at PAP-2642 · productive run stopped without continuation"');
    expect(html).toContain("border-red-600");
    expect(html).toContain("text-rose-500");
  });

  it("uses continuation_exhausted copy when the chain ran out of automatic continuations", () => {
    const html = renderToStaticMarkup(
      <StatusIcon
        status="blocked"
        blockerAttention={{
          state: "recovery_needed",
          reason: "continuation_exhausted",
          unresolvedBlockerCount: 1,
          coveredBlockerCount: 0,
          stalledBlockerCount: 0,
          attentionBlockerCount: 0,
          sampleBlockerIdentifier: "PAP-2642",
          sampleStalledBlockerIdentifier: null,
          nextActionOwner: { type: "agent", agentId: "agent-1", userId: null },
          nextActionHint: "create_recovery_issue",
        }}
      />,
    );

    expect(html).toContain('aria-label="Blocked · liveness break at PAP-2642 · automatic continuation exhausted"');
  });

  it("renders explicit_waiting issues with sky ring and waiting-on-board copy", () => {
    const html = renderToStaticMarkup(
      <StatusIcon
        status="in_progress"
        blockerAttention={{
          state: "covered",
          reason: "explicit_waiting",
          unresolvedBlockerCount: 0,
          coveredBlockerCount: 0,
          stalledBlockerCount: 0,
          attentionBlockerCount: 0,
          sampleBlockerIdentifier: null,
          sampleStalledBlockerIdentifier: null,
          nextActionOwner: { type: "user", agentId: null, userId: null },
          nextActionHint: "needs_human_review",
        }}
      />,
    );

    expect(html).toContain('data-blocker-attention-state="explicit_waiting"');
    expect(html).toContain('aria-label="Waiting on board"');
    expect(html).toContain("border-sky-600");
    expect(html).not.toContain("border-cyan-600");
    expect(html).not.toContain("border-red-600");
    expect(html).toContain("-bottom-0.5");
  });

  it("prefixes the explicit waiting tooltip with Blocked when the issue is also blocked", () => {
    const html = renderToStaticMarkup(
      <StatusIcon
        status="blocked"
        blockerAttention={{
          state: "covered",
          reason: "explicit_waiting",
          unresolvedBlockerCount: 0,
          coveredBlockerCount: 0,
          stalledBlockerCount: 0,
          attentionBlockerCount: 0,
          sampleBlockerIdentifier: "PAP-3000",
          sampleStalledBlockerIdentifier: null,
          nextActionOwner: { type: "user", agentId: null, userId: "user-1" },
          nextActionHint: "needs_human_review",
        }}
      />,
    );

    expect(html).toContain('aria-label="Blocked · waiting on user"');
    expect(html).toContain("border-sky-600");
  });

  it("renders stalled review chains with amber visual and stalled-leaf copy", () => {
    const html = renderToStaticMarkup(
      <StatusIcon
        status="blocked"
        blockerAttention={{
          state: "stalled",
          reason: "stalled_review",
          unresolvedBlockerCount: 1,
          coveredBlockerCount: 0,
          stalledBlockerCount: 1,
          attentionBlockerCount: 0,
          sampleBlockerIdentifier: "PAP-2279",
          sampleStalledBlockerIdentifier: "PAP-2279",
          nextActionOwner: null,
          nextActionHint: null,
        }}
      />,
    );

    expect(html).toContain('data-blocker-attention-state="stalled"');
    expect(html).toContain('aria-label="Blocked · review stalled on PAP-2279"');
    expect(html).toContain("border-amber-600");
    expect(html).not.toContain("border-cyan-600");
    expect(html).not.toContain("border-red-600");
  });
});
