import { describe, expect, it } from "vitest";
import type { PipelineCaseEvent } from "../api/pipelines";
import { formatLearningEvent } from "./pipeline-learnings";

function event(overrides: Partial<PipelineCaseEvent>): PipelineCaseEvent {
  return {
    id: "event-1",
    companyId: "company-1",
    pipelineId: "pipeline-1",
    caseId: "item-1",
    kind: "review_decided",
    createdAt: "2026-06-10T12:00:00.000Z",
    payload: {},
    caseTitle: "Launch tweet",
    pipelineName: "Content production",
    ...overrides,
  };
}

describe("formatLearningEvent", () => {
  it("translates review decisions with a target stage", () => {
    const result = formatLearningEvent(event({
      kind: "review_decided",
      toStageName: "Publish",
      payload: { actorName: "Dotta", decision: "approve" },
    }));

    expect(result.kind).toBe("review");
    expect(result.sentence).toBe("Dotta approved 'Launch tweet' moving to Publish.");
    expect(result.sentence).not.toContain("review_decided");
  });

  it("translates review decisions without optional context", () => {
    const result = formatLearningEvent(event({
      kind: "case.reviewed",
      payload: { decision: "request_changes" },
    }));

    expect(result.sentence).toBe("Someone sent back 'Launch tweet'.");
    expect(result.sentence).not.toContain("case.reviewed");
  });

  it("translates forced moves with a reason", () => {
    const result = formatLearningEvent(event({
      kind: "transition_forced",
      fromStageName: "Drafting",
      toStageName: "Done",
      payload: { reason: "Ready for the campaign" },
    }));

    expect(result.kind).toBe("forced_move");
    expect(result.sentence).toBe("'Launch tweet' was moved by hand from Drafting to Done - reason: Ready for the campaign.");
    expect(result.sentence).not.toContain("transition_forced");
  });

  it("translates forced moves without a reason", () => {
    const result = formatLearningEvent(event({
      kind: "case.transitioned",
      toStageName: "Done",
      payload: {},
    }));

    expect(result.sentence).toBe("'Launch tweet' was moved by hand to Done.");
    expect(result.sentence).not.toContain("case.transitioned");
  });
});
