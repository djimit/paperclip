import { describe, expect, it } from "vitest";
import { pipelineStageConfigSchema } from "./pipeline.js";

describe("pipeline stage variable schema", () => {
  it("validates select variables require options", () => {
    expect(
      pipelineStageConfigSchema.safeParse({
        variables: [{ key: "status", label: "Status", type: "select", options: ["open", "done"] }],
      }).success,
    ).toBe(true);

    expect(
      pipelineStageConfigSchema.safeParse({
        variables: [{ key: "status", label: "Status", type: "select", options: [] }],
      }).success,
    ).toBe(false);
  });

  it("enforces unique variable keys in stage config", () => {
    expect(
      pipelineStageConfigSchema.safeParse({
        variables: [
          { key: "repo", label: "Repo", type: "text" },
          { key: "repo", label: "Repo", type: "text" },
        ],
      }).success,
    ).toBe(false);
  });

  it("accepts run_routine onEnter action", () => {
    expect(
      pipelineStageConfigSchema.safeParse({
        variables: [],
        onEnter: {
          run_routine: {
            routineId: "11111111-1111-4111-8111-111111111111",
            variables: { issue_title: "title" },
            payload: { source: "pipeline" },
            caseFields: { requestedBy: "requester" },
          },
        },
      }).success,
    ).toBe(true);
  });

  it("rejects invalid onEnter run_routine configuration", () => {
    expect(
      pipelineStageConfigSchema.safeParse({
        variables: [],
        onEnter: {
          run_routine: {
            routineId: "not-a-uuid",
          },
        },
      }).success,
    ).toBe(false);
  });
});
