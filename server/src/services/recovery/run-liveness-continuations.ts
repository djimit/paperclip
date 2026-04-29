import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agentWakeupRequests, agents, heartbeatRuns, issues } from "@paperclipai/db";
import type { IssueStatus, RunLivenessState } from "@paperclipai/shared";
import { RECOVERY_REASON_KINDS } from "./origins.js";
import {
  classifyIssueExecutionDisposition,
  type IssueExecutionRunLivenessState,
  type IssueExecutionNextActionState,
} from "../issue-execution-disposition.js";

export const RUN_LIVENESS_CONTINUATION_REASON = RECOVERY_REASON_KINDS.runLivenessContinuation;
export const DEFAULT_MAX_LIVENESS_CONTINUATION_ATTEMPTS = 2;

const CONTINUATION_ACTIVE_ISSUE_STATUSES = new Set(["todo", "in_progress"]);
const IDEMPOTENT_WAKE_STATUSES = ["queued", "deferred_issue_execution", "completed"];

type HeartbeatRunRow = Pick<typeof heartbeatRuns.$inferSelect, "id" | "companyId" | "agentId" | "continuationAttempt">;
type IssueRow = Pick<
  typeof issues.$inferSelect,
  "id" | "companyId" | "identifier" | "title" | "status" | "assigneeAgentId" | "executionState" | "projectId"
>;
type AgentRow = Pick<typeof agents.$inferSelect, "id" | "companyId" | "status">;

export type RunContinuationDecision =
  | {
      kind: "enqueue";
      nextAttempt: number;
      idempotencyKey: string;
      payload: Record<string, unknown>;
      contextSnapshot: Record<string, unknown>;
    }
  | {
      kind: "exhausted";
      attempt: number;
      maxAttempts: number;
      comment: string;
    }
  | {
      kind: "skip";
      reason: string;
    };

export function readContinuationAttempt(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : 0;
}

export function buildRunLivenessContinuationIdempotencyKey(input: {
  issueId: string;
  sourceRunId: string;
  livenessState: RunLivenessState;
  nextAttempt: number;
}) {
  return [
    RUN_LIVENESS_CONTINUATION_REASON,
    input.issueId,
    input.sourceRunId,
    input.livenessState,
    String(input.nextAttempt),
  ].join(":");
}

function nextActionStateForContinuation(nextAction: string | null): IssueExecutionNextActionState {
  return nextAction?.trim() ? "runnable" : "none";
}

function livenessStateForDisposition(livenessState: RunLivenessState): IssueExecutionRunLivenessState {
  return livenessState;
}

export async function findExistingRunLivenessContinuationWake(
  db: Db,
  input: {
    companyId: string;
    idempotencyKey: string;
  },
) {
  return db
    .select({ id: agentWakeupRequests.id, status: agentWakeupRequests.status })
    .from(agentWakeupRequests)
    .where(
      and(
        eq(agentWakeupRequests.companyId, input.companyId),
        eq(agentWakeupRequests.idempotencyKey, input.idempotencyKey),
        inArray(agentWakeupRequests.status, IDEMPOTENT_WAKE_STATUSES),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);
}

export function decideRunLivenessContinuation(input: {
  run: HeartbeatRunRow;
  issue: IssueRow | null;
  agent: AgentRow | null;
  livenessState: RunLivenessState | null;
  livenessReason: string | null;
  nextAction: string | null;
  budgetBlocked: boolean;
  idempotentWakeExists: boolean;
  maxAttempts?: number;
}): RunContinuationDecision {
  const {
    run,
    issue,
    agent,
    livenessState,
    livenessReason,
    nextAction,
    budgetBlocked,
    idempotentWakeExists,
  } = input;
  const maxAttempts = input.maxAttempts ?? DEFAULT_MAX_LIVENESS_CONTINUATION_ATTEMPTS;

  if (!livenessState) {
    return { kind: "skip", reason: "liveness state is not actionable for continuation" };
  }

  if (!issue) return { kind: "skip", reason: "issue not found" };
  if (!agent) return { kind: "skip", reason: "agent not found" };
  if (issue.companyId !== run.companyId || agent.companyId !== run.companyId) {
    return { kind: "skip", reason: "company scope mismatch" };
  }
  if (issue.assigneeAgentId !== run.agentId) {
    return { kind: "skip", reason: "issue is no longer assigned to the source run agent" };
  }
  if (!CONTINUATION_ACTIVE_ISSUE_STATUSES.has(issue.status)) {
    return { kind: "skip", reason: `issue status ${issue.status} is not continuable` };
  }
  if (issue.executionState) {
    return { kind: "skip", reason: "issue is blocked by execution policy state" };
  }

  const currentAttempt = readContinuationAttempt(run.continuationAttempt);
  const disposition = classifyIssueExecutionDisposition({
    issue: {
      id: issue.id,
      status: issue.status as IssueStatus,
      assigneeAgentId: issue.assigneeAgentId,
      assigneeUserId: null,
    },
    agent,
    latestRun: {
      latestRunStatus: "succeeded",
      livenessState: livenessStateForDisposition(livenessState),
      nextAction: nextActionStateForContinuation(nextAction),
      continuationAttempt: currentAttempt,
      maxContinuationAttempts: maxAttempts,
    },
    gates: { budgetBlocked },
  });

  if (budgetBlocked) {
    return { kind: "skip", reason: "budget hard stop blocks continuation" };
  }
  if (disposition.kind === "human_escalation_required" && disposition.owner === "manager" && currentAttempt >= maxAttempts) {
    return {
      kind: "exhausted",
      attempt: currentAttempt,
      maxAttempts,
      comment: [
        "Bounded liveness continuation exhausted",
        "",
        `- Last liveness state: \`${livenessState}\``,
        `- Attempts used: ${currentAttempt}/${maxAttempts}`,
        `- Reason: ${livenessReason ?? "Run ended without concrete progress"}`,
        "- Next action: a human or manager should inspect the run and either clarify the task, mark it blocked, or assign a concrete follow-up.",
      ].join("\n"),
    };
  }
  if (disposition.kind !== "agent_continuable") {
    return { kind: "skip", reason: `canonical disposition ${disposition.kind} is not continuable` };
  }

  if (currentAttempt >= maxAttempts) {
    return {
      kind: "exhausted",
      attempt: currentAttempt,
      maxAttempts,
      comment: [
        "Bounded liveness continuation exhausted",
        "",
        `- Last liveness state: \`${livenessState}\``,
        `- Attempts used: ${currentAttempt}/${maxAttempts}`,
        `- Reason: ${livenessReason ?? "Run ended without concrete progress"}`,
        "- Next action: a human or manager should inspect the run and either clarify the task, mark it blocked, or assign a concrete follow-up.",
      ].join("\n"),
    };
  }

  const nextAttempt = currentAttempt + 1;
  const idempotencyKey = buildRunLivenessContinuationIdempotencyKey({
    issueId: issue.id,
    sourceRunId: run.id,
    livenessState,
    nextAttempt,
  });
  if (idempotentWakeExists) {
    return { kind: "skip", reason: "continuation wake already exists for this source run and attempt" };
  }

  const payload = {
    issueId: issue.id,
    sourceRunId: run.id,
    livenessState,
    livenessReason,
    continuationAttempt: nextAttempt,
    maxContinuationAttempts: maxAttempts,
    instruction:
      nextAction ??
      "The previous run ended without concrete progress. Take the first concrete action now or mark the issue blocked with a specific unblock request.",
  };

  return {
    kind: "enqueue",
    nextAttempt,
    idempotencyKey,
    payload,
    contextSnapshot: {
      issueId: issue.id,
      taskId: issue.id,
      taskKey: issue.id,
      wakeReason: RUN_LIVENESS_CONTINUATION_REASON,
      livenessContinuationAttempt: nextAttempt,
      livenessContinuationMaxAttempts: maxAttempts,
      livenessContinuationSourceRunId: run.id,
      livenessContinuationState: livenessState,
      livenessContinuationReason: livenessReason,
      livenessContinuationInstruction: payload.instruction,
    },
  };
}
