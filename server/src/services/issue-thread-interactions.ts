import { and, asc, eq, inArray } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import {
  heartbeatRuns,
  issueComments,
  issueThreadInteractions,
  issues,
} from "@paperclipai/db";
import type {
  AskUserQuestionsAnswer,
  AskUserQuestionsInteraction,
  CreateIssueThreadInteraction,
  IssueThreadInteraction,
  RejectIssueThreadInteraction,
  RespondIssueThreadInteraction,
  SuggestTasksInteraction,
  SuggestTasksResultCreatedTask,
} from "@paperclipai/shared";
import {
  askUserQuestionsPayloadSchema,
  askUserQuestionsResultSchema,
  createIssueThreadInteractionSchema,
  suggestTasksPayloadSchema,
  suggestTasksResultSchema,
} from "@paperclipai/shared";
import { conflict, notFound, unprocessable } from "../errors.js";
import { issueService } from "./issues.js";

type InteractionActor = {
  agentId?: string | null;
  userId?: string | null;
};

type CreatedIssueWakeTarget = {
  id: string;
  assigneeAgentId: string | null;
  status: string;
};

function hydrateInteraction(
  row: typeof issueThreadInteractions.$inferSelect,
): IssueThreadInteraction {
  const base = {
    ...row,
    status: row.status as IssueThreadInteraction["status"],
    continuationPolicy: row.continuationPolicy as IssueThreadInteraction["continuationPolicy"],
  };

  switch (row.kind) {
    case "suggest_tasks":
      return {
        ...base,
        kind: "suggest_tasks",
        payload: suggestTasksPayloadSchema.parse(row.payload),
        result: row.result ? suggestTasksResultSchema.parse(row.result) : null,
      } satisfies SuggestTasksInteraction;
    case "ask_user_questions":
      return {
        ...base,
        kind: "ask_user_questions",
        payload: askUserQuestionsPayloadSchema.parse(row.payload),
        result: row.result ? askUserQuestionsResultSchema.parse(row.result) : null,
      } satisfies AskUserQuestionsInteraction;
    default:
      throw unprocessable(`Unknown interaction kind: ${row.kind}`);
  }
}

async function touchIssue(db: Db | any, issueId: string) {
  await db
    .update(issues)
    .set({ updatedAt: new Date() })
    .where(eq(issues.id, issueId));
}

function buildTaskCreationOrder(tasks: ReadonlyArray<SuggestTasksInteraction["payload"]["tasks"][number]>) {
  const taskByClientKey = new Map(tasks.map((task) => [task.clientKey, task] as const));
  const ordered: Array<SuggestTasksInteraction["payload"]["tasks"][number]> = [];
  const state = new Map<string, "visiting" | "done">();

  const visit = (clientKey: string) => {
    const currentState = state.get(clientKey);
    if (currentState === "done") return;
    if (currentState === "visiting") {
      throw unprocessable("Suggested tasks contain a parentClientKey cycle");
    }

    const task = taskByClientKey.get(clientKey);
    if (!task) {
      throw unprocessable(`Unknown parentClientKey: ${clientKey}`);
    }

    state.set(clientKey, "visiting");
    if (task.parentClientKey) {
      visit(task.parentClientKey);
    }
    state.set(clientKey, "done");
    ordered.push(task);
  };

  for (const task of tasks) {
    visit(task.clientKey);
  }

  return ordered;
}

function normalizeQuestionAnswers(args: {
  questions: AskUserQuestionsInteraction["payload"]["questions"];
  answers: RespondIssueThreadInteraction["answers"];
}) {
  const questionById = new Map(args.questions.map((question) => [question.id, question] as const));
  const answerByQuestionId = new Map<string, AskUserQuestionsAnswer>();

  for (const answer of args.answers) {
    const question = questionById.get(answer.questionId);
    if (!question) {
      throw unprocessable(`Unknown questionId: ${answer.questionId}`);
    }
    if (answerByQuestionId.has(answer.questionId)) {
      throw unprocessable(`Duplicate answer for questionId: ${answer.questionId}`);
    }

    const uniqueOptionIds = [...new Set(answer.optionIds)];
    const validOptionIds = new Set(question.options.map((option) => option.id));
    for (const optionId of uniqueOptionIds) {
      if (!validOptionIds.has(optionId)) {
        throw unprocessable(`Unknown optionId for question ${answer.questionId}: ${optionId}`);
      }
    }

    if (question.selectionMode === "single" && uniqueOptionIds.length > 1) {
      throw unprocessable(`Question ${answer.questionId} only allows one answer`);
    }

    answerByQuestionId.set(answer.questionId, {
      questionId: answer.questionId,
      optionIds: uniqueOptionIds,
    });
  }

  for (const question of args.questions) {
    const answer = answerByQuestionId.get(question.id);
    if (question.required && (!answer || answer.optionIds.length === 0)) {
      throw unprocessable(`Question ${question.id} requires an answer`);
    }
  }

  return args.questions
    .map((question) => answerByQuestionId.get(question.id))
    .filter((answer): answer is AskUserQuestionsAnswer => Boolean(answer));
}

export function issueThreadInteractionService(db: Db) {
  return {
    listForIssue: async (issueId: string) => {
      const rows = await db
        .select()
        .from(issueThreadInteractions)
        .where(eq(issueThreadInteractions.issueId, issueId))
        .orderBy(asc(issueThreadInteractions.createdAt), asc(issueThreadInteractions.id));

      return rows.map((row) => hydrateInteraction(row));
    },

    getById: async (interactionId: string) => {
      const row = await db
        .select()
        .from(issueThreadInteractions)
        .where(eq(issueThreadInteractions.id, interactionId))
        .then((rows) => rows[0] ?? null);

      return row ? hydrateInteraction(row) : null;
    },

    create: async (
      issue: { id: string; companyId: string },
      input: CreateIssueThreadInteraction,
      actor: InteractionActor,
    ) => {
      const data = createIssueThreadInteractionSchema.parse(input);

      if (data.sourceCommentId) {
        const sourceComment = await db
          .select({
            companyId: issueComments.companyId,
            issueId: issueComments.issueId,
          })
          .from(issueComments)
          .where(eq(issueComments.id, data.sourceCommentId))
          .then((rows) => rows[0] ?? null);
        if (!sourceComment || sourceComment.companyId !== issue.companyId || sourceComment.issueId !== issue.id) {
          throw unprocessable("sourceCommentId must belong to the same issue and company");
        }
      }

      if (data.sourceRunId) {
        const sourceRun = await db
          .select({
            companyId: heartbeatRuns.companyId,
          })
          .from(heartbeatRuns)
          .where(eq(heartbeatRuns.id, data.sourceRunId))
          .then((rows) => rows[0] ?? null);
        if (!sourceRun || sourceRun.companyId !== issue.companyId) {
          throw unprocessable("sourceRunId must belong to the same company");
        }
      }

      const [created] = await db
        .insert(issueThreadInteractions)
        .values({
          companyId: issue.companyId,
          issueId: issue.id,
          kind: data.kind,
          status: "pending",
          continuationPolicy: data.continuationPolicy,
          sourceCommentId: data.sourceCommentId ?? null,
          sourceRunId: data.sourceRunId ?? null,
          title: data.title ?? null,
          summary: data.summary ?? null,
          createdByAgentId: actor.agentId ?? null,
          createdByUserId: actor.userId ?? null,
          payload: data.payload,
        })
        .returning();

      await touchIssue(db, issue.id);
      return hydrateInteraction(created);
    },

    acceptSuggestedTasks: async (
      issue: { id: string; companyId: string; projectId: string | null; goalId: string | null },
      interactionId: string,
      actor: InteractionActor,
    ) => {
      const current = await db
        .select()
        .from(issueThreadInteractions)
        .where(eq(issueThreadInteractions.id, interactionId))
        .then((rows) => rows[0] ?? null);

      if (!current) throw notFound("Interaction not found");
      if (current.companyId !== issue.companyId || current.issueId !== issue.id) {
        throw notFound("Interaction not found");
      }
      if (current.kind !== "suggest_tasks") {
        throw unprocessable("Only suggest_tasks interactions can be accepted");
      }
      if (current.status !== "pending") {
        throw conflict("Interaction has already been resolved");
      }

      const interaction = hydrateInteraction(current) as SuggestTasksInteraction;
      const orderedTasks = buildTaskCreationOrder(interaction.payload.tasks);
      const explicitParentIds = [...new Set([
        issue.id,
        ...(interaction.payload.defaultParentId ? [interaction.payload.defaultParentId] : []),
        ...interaction.payload.tasks
          .map((task) => task.parentId ?? null)
          .filter((value): value is string => Boolean(value)),
      ])];

      const parentRows = explicitParentIds.length === 0
        ? []
        : await db
          .select({
            id: issues.id,
            identifier: issues.identifier,
            companyId: issues.companyId,
          })
          .from(issues)
          .where(and(eq(issues.companyId, issue.companyId), inArray(issues.id, explicitParentIds)));
      if (parentRows.length !== explicitParentIds.length) {
        throw unprocessable("Suggested tasks reference parent issues outside this company or issue tree");
      }

      const parentById = new Map(parentRows.map((row) => [row.id, row] as const));
      const createdByClientKey = new Map<string, SuggestTasksResultCreatedTask>();
      const createdWakeTargets: CreatedIssueWakeTarget[] = [];

      await db.transaction(async (tx) => {
        for (const task of orderedTasks) {
          const parentIssueId = task.parentClientKey
            ? createdByClientKey.get(task.parentClientKey)?.issueId ?? null
            : task.parentId ?? interaction.payload.defaultParentId ?? issue.id;
          if (!parentIssueId) {
            throw unprocessable(`Unable to resolve parent for suggested task ${task.clientKey}`);
          }

          const { issue: createdIssue } = await issueService(tx as unknown as Db).createChild(parentIssueId, {
            title: task.title,
            description: task.description ?? null,
            status: "todo",
            priority: task.priority ?? "medium",
            assigneeAgentId: task.assigneeAgentId ?? null,
            assigneeUserId: task.assigneeUserId ?? null,
            projectId: task.projectId ?? issue.projectId,
            goalId: task.goalId ?? issue.goalId,
            billingCode: task.billingCode ?? null,
            createdByAgentId: actor.agentId ?? null,
            createdByUserId: actor.userId ?? null,
            actorAgentId: actor.agentId ?? null,
            actorUserId: actor.userId ?? null,
          } as Parameters<ReturnType<typeof issueService>["createChild"]>[1]);

          const parentIdentifier = createdByClientKey.get(task.parentClientKey ?? "")?.identifier
            ?? parentById.get(parentIssueId)?.identifier
            ?? null;
          createdByClientKey.set(task.clientKey, {
            clientKey: task.clientKey,
            issueId: createdIssue.id,
            identifier: createdIssue.identifier ?? null,
            title: createdIssue.title,
            parentIssueId,
            parentIdentifier,
          });
          createdWakeTargets.push({
            id: createdIssue.id,
            assigneeAgentId: createdIssue.assigneeAgentId ?? null,
            status: createdIssue.status,
          });
        }

        const [updated] = await tx
          .update(issueThreadInteractions)
          .set({
            status: "accepted",
            result: {
              version: 1,
              createdTasks: [...createdByClientKey.values()],
            },
            resolvedByAgentId: actor.agentId ?? null,
            resolvedByUserId: actor.userId ?? null,
            resolvedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(issueThreadInteractions.id, interactionId))
          .returning();

        await touchIssue(tx, issue.id);
        current.status = updated.status;
        current.result = updated.result;
        current.resolvedByAgentId = updated.resolvedByAgentId;
        current.resolvedByUserId = updated.resolvedByUserId;
        current.resolvedAt = updated.resolvedAt;
        current.updatedAt = updated.updatedAt;
      });

      return {
        interaction: hydrateInteraction(current),
        createdIssues: createdWakeTargets,
      };
    },

    rejectSuggestedTasks: async (
      issue: { id: string; companyId: string },
      interactionId: string,
      input: RejectIssueThreadInteraction,
      actor: InteractionActor,
    ) => {
      const current = await db
        .select()
        .from(issueThreadInteractions)
        .where(eq(issueThreadInteractions.id, interactionId))
        .then((rows) => rows[0] ?? null);

      if (!current) throw notFound("Interaction not found");
      if (current.companyId !== issue.companyId || current.issueId !== issue.id) {
        throw notFound("Interaction not found");
      }
      if (current.kind !== "suggest_tasks") {
        throw unprocessable("Only suggest_tasks interactions can be rejected");
      }
      if (current.status !== "pending") {
        throw conflict("Interaction has already been resolved");
      }

      const [updated] = await db
        .update(issueThreadInteractions)
        .set({
          status: "rejected",
          result: {
            version: 1,
            rejectionReason: input.reason?.trim() || null,
          },
          resolvedByAgentId: actor.agentId ?? null,
          resolvedByUserId: actor.userId ?? null,
          resolvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(issueThreadInteractions.id, interactionId))
        .returning();

      await touchIssue(db, issue.id);
      return hydrateInteraction(updated);
    },

    answerQuestions: async (
      issue: { id: string; companyId: string },
      interactionId: string,
      input: RespondIssueThreadInteraction,
      actor: InteractionActor,
    ) => {
      const current = await db
        .select()
        .from(issueThreadInteractions)
        .where(eq(issueThreadInteractions.id, interactionId))
        .then((rows) => rows[0] ?? null);

      if (!current) throw notFound("Interaction not found");
      if (current.companyId !== issue.companyId || current.issueId !== issue.id) {
        throw notFound("Interaction not found");
      }
      if (current.kind !== "ask_user_questions") {
        throw unprocessable("Only ask_user_questions interactions can be answered");
      }
      if (current.status !== "pending") {
        throw conflict("Interaction has already been resolved");
      }

      const interaction = hydrateInteraction(current) as AskUserQuestionsInteraction;
      const normalizedAnswers = normalizeQuestionAnswers({
        questions: interaction.payload.questions,
        answers: input.answers,
      });

      const [updated] = await db
        .update(issueThreadInteractions)
        .set({
          status: "answered",
          result: {
            version: 1,
            answers: normalizedAnswers,
            summaryMarkdown: input.summaryMarkdown ?? null,
          },
          resolvedByAgentId: actor.agentId ?? null,
          resolvedByUserId: actor.userId ?? null,
          resolvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(issueThreadInteractions.id, interactionId))
        .returning();

      await touchIssue(db, issue.id);
      return hydrateInteraction(updated);
    },
  };
}
