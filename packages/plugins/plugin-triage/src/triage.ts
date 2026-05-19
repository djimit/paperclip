import { createHash, randomUUID } from "node:crypto";
import type { Issue, PluginContext } from "@paperclipai/plugin-sdk";

export type TriageQueueStatus = "active" | "archived";
export type TriageItemStatus = "active" | "archived";

export interface TriageQueue {
  id: string;
  companyId: string;
  queueKey: string;
  title: string;
  description: string | null;
  status: TriageQueueStatus;
  defaultStateKey: string;
  activeItemCount: number;
  archivedItemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TriageItem {
  id: string;
  companyId: string;
  queueId: string;
  itemKey: string | null;
  idempotencyKey: string | null;
  title: string;
  contentFormat: string;
  content: string;
  properties: Record<string, unknown>;
  stateKey: string;
  status: TriageItemStatus;
  linkedQueueChatId: string | null;
  linkedWorkIssueId: string | null;
  revision: number;
  lastIngestedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface TriageItemEvent {
  id: string;
  companyId: string;
  queueId: string;
  itemId: string | null;
  eventType: string;
  fromStateKey: string | null;
  toStateKey: string | null;
  actorType: string | null;
  actorId: string | null;
  actorRunId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface TriageQueueChat {
  id: string;
  companyId: string;
  queueId: string;
  hiddenIssueId: string | null;
  title: string | null;
  status: "active" | "archived";
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface TriageGuidanceDoc {
  id: string;
  companyId: string;
  queueId: string;
  path: string;
  title: string;
  status: "active" | "archived";
  currentRevisionId: string | null;
  content: string;
  contentHash: string | null;
  summary: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface TriageGuidanceRevision {
  id: string;
  companyId: string;
  queueId: string;
  docId: string;
  content: string;
  contentHash: string | null;
  summary: string | null;
  actorType: string | null;
  actorId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type TriageGuidanceProposalStatus = "proposed" | "revised" | "accepted" | "rejected";

export interface TriageGuidanceProposal {
  id: string;
  companyId: string;
  queueId: string;
  itemId: string | null;
  targetDocId: string | null;
  status: TriageGuidanceProposalStatus;
  proposedContent: string;
  rationale: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface TriageActor {
  actorType?: string | null;
  actorId?: string | null;
  actorRunId?: string | null;
}

export type TriageIssueActionMode = "create_if_missing" | "update_existing" | "create_or_update";

export interface TriageCreateOrUpdateIssueAction {
  type: "create_or_update_issue";
  mode: TriageIssueActionMode;
  template: Record<string, string>;
}

export interface TriageTransitionAction {
  id: string;
  companyId: string;
  queueId: string;
  actionKey: string;
  fromStateKey: string;
  toStateKey: string;
  actionType: "create_or_update_issue";
  enabled: boolean;
  action: TriageCreateOrUpdateIssueAction;
  createdAt: string;
  updatedAt: string;
}

export interface TriageTransitionActionResult {
  actionKey: string;
  actionType: "create_or_update_issue";
  mode: TriageIssueActionMode;
  result: "created" | "updated" | "skipped_existing";
  issueId: string | null;
  commentCreated: boolean;
}

export interface TriageItemTransitionResult {
  item: TriageItem;
  transitionEvent: TriageItemEvent;
  actionEvents: TriageItemEvent[];
  actionResults: TriageTransitionActionResult[];
}

export interface IngestItemInput {
  companyId: string;
  queueKey: string;
  title?: string | null;
  contentFormat?: string | null;
  content?: string | null;
  properties?: Record<string, unknown> | null;
  itemKey?: string | null;
  idempotencyKey?: string | null;
  requireExistingQueue?: boolean;
  initialStateKey?: string | null;
}

export interface IngestItemResult {
  queue: TriageQueue;
  item: TriageItem;
  event: TriageItemEvent;
  createdQueue: boolean;
  createdItem: boolean;
  upserted: boolean;
}

export class TriageError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "TriageError";
  }
}

export interface TriageStore {
  listQueues(companyId: string): Promise<TriageQueue[]>;
  getQueue(companyId: string, queueKey: string): Promise<TriageQueue | null>;
  getQueueById(companyId: string, queueId: string): Promise<TriageQueue | null>;
  createQueue(input: {
    companyId: string;
    queueKey: string;
    title: string;
    description?: string | null;
  }): Promise<{ queue: TriageQueue; created: boolean }>;
  ensureQueueDefaults(queue: TriageQueue): Promise<void>;
  updateQueue(input: {
    companyId: string;
    queueKey: string;
    title?: string | null;
    description?: string | null;
    status?: TriageQueueStatus;
  }): Promise<TriageQueue>;
  archiveQueue(companyId: string, queueKey: string): Promise<TriageQueue>;
  listItems(companyId: string, queueKey: string): Promise<TriageItem[]>;
  getItem(companyId: string, itemId: string): Promise<TriageItem | null>;
  findItemsByKeys(input: {
    companyId: string;
    queueId: string;
    itemKey?: string | null;
    idempotencyKey?: string | null;
  }): Promise<TriageItem[]>;
  insertItem(input: {
    companyId: string;
    queueId: string;
    itemKey?: string | null;
    idempotencyKey?: string | null;
    title: string;
    contentFormat: string;
    content: string;
    properties: Record<string, unknown>;
    stateKey: string;
  }): Promise<TriageItem>;
  updateItem(input: {
    companyId: string;
    itemId: string;
    itemKey?: string | null;
    idempotencyKey?: string | null;
    title?: string | null;
    contentFormat?: string | null;
    content?: string | null;
    properties?: Record<string, unknown> | null;
    stateKey?: string | null;
    status?: TriageItemStatus;
    linkedQueueChatId?: string | null;
    linkedWorkIssueId?: string | null;
  }): Promise<TriageItem>;
  archiveItem(companyId: string, itemId: string): Promise<TriageItem>;
  upsertTransitionAction(input: {
    companyId: string;
    queueId: string;
    actionKey: string;
    fromStateKey: string;
    toStateKey: string;
    action: TriageCreateOrUpdateIssueAction;
    enabled?: boolean;
  }): Promise<TriageTransitionAction>;
  listTransitionActions(input: {
    companyId: string;
    queueId: string;
    fromStateKey?: string | null;
    toStateKey?: string | null;
    actionKey?: string | null;
  }): Promise<TriageTransitionAction[]>;
  recordItemEvent(input: {
    companyId: string;
    queueId: string;
    itemId: string | null;
    eventType: string;
    fromStateKey?: string | null;
    toStateKey?: string | null;
    actor?: TriageActor;
    metadata?: Record<string, unknown>;
  }): Promise<TriageItemEvent>;
  listItemEvents(companyId: string, itemId: string): Promise<TriageItemEvent[]>;
  getActiveQueueChat(companyId: string, queueId: string): Promise<TriageQueueChat | null>;
  createQueueChat(input: {
    companyId: string;
    queueId: string;
    hiddenIssueId?: string | null;
    title?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<{ chat: TriageQueueChat; created: boolean }>;
  updateQueueChat(input: {
    companyId: string;
    chatId: string;
    hiddenIssueId?: string | null;
    title?: string | null;
    status?: TriageQueueChat["status"];
    metadata?: Record<string, unknown>;
  }): Promise<TriageQueueChat>;
  listGuidanceDocs(companyId: string, queueId: string): Promise<TriageGuidanceDoc[]>;
  getGuidanceDocByPath(companyId: string, queueId: string, path: string): Promise<TriageGuidanceDoc | null>;
  upsertGuidanceRevision(input: {
    companyId: string;
    queueId: string;
    path: string;
    title: string;
    content: string;
    summary?: string | null;
    actor?: TriageActor;
    metadata?: Record<string, unknown>;
  }): Promise<{ doc: TriageGuidanceDoc; revision: TriageGuidanceRevision }>;
  listGuidanceProposals(companyId: string, queueId: string): Promise<TriageGuidanceProposal[]>;
  getGuidanceProposal(companyId: string, proposalId: string): Promise<TriageGuidanceProposal | null>;
  createGuidanceProposal(input: {
    companyId: string;
    queueId: string;
    itemId?: string | null;
    targetDocId?: string | null;
    proposedContent: string;
    rationale?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<TriageGuidanceProposal>;
  updateGuidanceProposal(input: {
    companyId: string;
    proposalId: string;
    status?: TriageGuidanceProposalStatus;
    proposedContent?: string | null;
    rationale?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<TriageGuidanceProposal>;
}

function nowIso(): string {
  return new Date().toISOString();
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.trim()) return value;
  return nowIso();
}

function stringField(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function objectField(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function jsonObjectField(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      return objectField(JSON.parse(value));
    } catch {
      return {};
    }
  }
  return objectField(value);
}

function normalizeQueueKey(value: unknown): string {
  const queueKey = stringField(value);
  if (!queueKey) {
    throw new TriageError(400, "queue_key_required", "queueKey is required");
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(queueKey)) {
    throw new TriageError(
      422,
      "invalid_queue_key",
      "queueKey must start with a letter or number and may contain letters, numbers, dot, underscore, colon, or hyphen",
    );
  }
  return queueKey;
}

function requireCompanyId(value: unknown): string {
  const companyId = stringField(value);
  if (!companyId) throw new TriageError(400, "company_id_required", "companyId is required");
  return companyId;
}

function defaultQueueTitle(queueKey: string): string {
  const words = queueKey.replace(/[._:-]+/g, " ").trim();
  if (!words) return "Queue";
  return words.replace(/\b\w/g, (char) => char.toUpperCase());
}

function sanitizeContentFormat(value: unknown): string {
  const contentFormat = stringField(value) ?? "markdown";
  if (!/^[A-Za-z0-9._+-]{1,40}$/.test(contentFormat)) {
    throw new TriageError(422, "invalid_content_format", "contentFormat is invalid");
  }
  return contentFormat;
}

function normalizeStateKey(value: unknown, fieldName: string): string {
  const stateKey = stringField(value);
  if (!stateKey) throw new TriageError(400, `${fieldName}_required`, `${fieldName} is required`);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(stateKey)) {
    throw new TriageError(422, `invalid_${fieldName}`, `${fieldName} is invalid`);
  }
  return stateKey;
}

function normalizeActionKey(value: unknown): string {
  const actionKey = stringField(value);
  if (!actionKey) throw new TriageError(400, "action_key_required", "actionKey is required");
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(actionKey)) {
    throw new TriageError(422, "invalid_action_key", "actionKey is invalid");
  }
  return actionKey;
}

const ISSUE_TEMPLATE_FIELDS = new Set([
  "title",
  "description",
  "comment",
  "projectId",
  "assignee",
  "assigneeAgentId",
  "assigneeUserId",
  "priority",
  "status",
]);

const ISSUE_PRIORITIES = new Set<Issue["priority"]>(["critical", "high", "medium", "low"]);
const ISSUE_STATUSES = new Set<Issue["status"]>([
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "blocked",
  "cancelled",
]);

function parseTransitionIssueAction(value: unknown): TriageCreateOrUpdateIssueAction {
  const raw = objectField(value);
  if (raw.type !== "create_or_update_issue") {
    throw new TriageError(422, "unsupported_transition_action", "Only create_or_update_issue actions are supported in v1");
  }
  const mode = raw.mode === "create_if_missing" || raw.mode === "update_existing" || raw.mode === "create_or_update"
    ? raw.mode
    : null;
  if (!mode) {
    throw new TriageError(422, "invalid_transition_action_mode", "Transition action mode is invalid");
  }
  const template = objectField(raw.template);
  const templateKeys = Object.keys(template);
  if (templateKeys.length === 0) {
    throw new TriageError(422, "invalid_transition_action_template", "Transition action template cannot be empty");
  }
  for (const key of templateKeys) {
    if (!ISSUE_TEMPLATE_FIELDS.has(key)) {
      throw new TriageError(422, "invalid_transition_action_template", `Unsupported issue template field: ${key}`);
    }
    if (typeof template[key] !== "string") {
      throw new TriageError(422, "invalid_transition_action_template", `Issue template field must be a string: ${key}`);
    }
  }
  if ((mode === "create_if_missing" || mode === "create_or_update") && typeof template.title !== "string") {
    throw new TriageError(422, "invalid_transition_action_template", "Issue template title is required when an action can create an issue");
  }
  return {
    type: "create_or_update_issue",
    mode,
    template: Object.fromEntries(templateKeys.map((key) => [key, String(template[key])])),
  };
}

function table(namespace: string, name: string): string {
  return `${namespace}.${name}`;
}

function queueFromRow(row: Record<string, unknown>): TriageQueue {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    queueKey: String(row.queue_key),
    title: String(row.title),
    description: row.description === null || row.description === undefined ? null : String(row.description),
    status: row.status === "archived" ? "archived" : "active",
    defaultStateKey: String(row.default_state_key ?? "draft"),
    activeItemCount: Number(row.active_item_count ?? 0),
    archivedItemCount: Number(row.archived_item_count ?? 0),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function itemFromRow(row: Record<string, unknown>): TriageItem {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    queueId: String(row.queue_id),
    itemKey: row.item_key === null || row.item_key === undefined ? null : String(row.item_key),
    idempotencyKey: row.idempotency_key === null || row.idempotency_key === undefined
      ? null
      : String(row.idempotency_key),
    title: String(row.title),
    contentFormat: String(row.content_format ?? "markdown"),
    content: String(row.content ?? ""),
    properties: objectField(row.properties),
    stateKey: String(row.state_key ?? "draft"),
    status: row.status === "archived" ? "archived" : "active",
    linkedQueueChatId: row.linked_queue_chat_id === null || row.linked_queue_chat_id === undefined
      ? null
      : String(row.linked_queue_chat_id),
    linkedWorkIssueId: row.linked_work_issue_id === null || row.linked_work_issue_id === undefined
      ? null
      : String(row.linked_work_issue_id),
    revision: Number(row.revision ?? 1),
    lastIngestedAt: toIso(row.last_ingested_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function eventFromRow(row: Record<string, unknown>): TriageItemEvent {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    queueId: String(row.queue_id),
    itemId: row.item_id === null || row.item_id === undefined ? null : String(row.item_id),
    eventType: String(row.event_type),
    fromStateKey: row.from_state_key === null || row.from_state_key === undefined ? null : String(row.from_state_key),
    toStateKey: row.to_state_key === null || row.to_state_key === undefined ? null : String(row.to_state_key),
    actorType: row.actor_type === null || row.actor_type === undefined ? null : String(row.actor_type),
    actorId: row.actor_id === null || row.actor_id === undefined ? null : String(row.actor_id),
    actorRunId: row.actor_run_id === null || row.actor_run_id === undefined ? null : String(row.actor_run_id),
    metadata: objectField(row.metadata),
    createdAt: toIso(row.created_at),
  };
}

function actionFromRow(row: Record<string, unknown>): TriageTransitionAction {
  const action = parseTransitionIssueAction(jsonObjectField(row.template));
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    queueId: String(row.queue_id),
    actionKey: String(row.action_key),
    fromStateKey: String(row.from_state_key),
    toStateKey: String(row.to_state_key),
    actionType: "create_or_update_issue",
    enabled: row.enabled !== false,
    action,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function chatFromRow(row: Record<string, unknown>): TriageQueueChat {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    queueId: String(row.queue_id),
    hiddenIssueId: row.hidden_issue_id === null || row.hidden_issue_id === undefined
      ? null
      : String(row.hidden_issue_id),
    title: row.title === null || row.title === undefined ? null : String(row.title),
    status: row.status === "archived" ? "archived" : "active",
    metadata: objectField(row.metadata),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function guidanceDocFromRow(row: Record<string, unknown>): TriageGuidanceDoc {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    queueId: String(row.queue_id),
    path: String(row.path),
    title: String(row.title),
    status: row.status === "archived" ? "archived" : "active",
    currentRevisionId: row.current_revision_id === null || row.current_revision_id === undefined
      ? null
      : String(row.current_revision_id),
    content: String(row.content ?? ""),
    contentHash: row.content_hash === null || row.content_hash === undefined ? null : String(row.content_hash),
    summary: row.summary === null || row.summary === undefined ? null : String(row.summary),
    metadata: objectField(row.metadata),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function guidanceRevisionFromRow(row: Record<string, unknown>): TriageGuidanceRevision {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    queueId: String(row.queue_id),
    docId: String(row.doc_id),
    content: String(row.content ?? ""),
    contentHash: row.content_hash === null || row.content_hash === undefined ? null : String(row.content_hash),
    summary: row.summary === null || row.summary === undefined ? null : String(row.summary),
    actorType: row.actor_type === null || row.actor_type === undefined ? null : String(row.actor_type),
    actorId: row.actor_id === null || row.actor_id === undefined ? null : String(row.actor_id),
    metadata: objectField(row.metadata),
    createdAt: toIso(row.created_at),
  };
}

function proposalStatus(value: unknown): TriageGuidanceProposalStatus {
  return value === "accepted" || value === "rejected" || value === "revised" ? value : "proposed";
}

function guidanceProposalFromRow(row: Record<string, unknown>): TriageGuidanceProposal {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    queueId: String(row.queue_id),
    itemId: row.item_id === null || row.item_id === undefined ? null : String(row.item_id),
    targetDocId: row.target_doc_id === null || row.target_doc_id === undefined ? null : String(row.target_doc_id),
    status: proposalStatus(row.status),
    proposedContent: String(row.proposed_content ?? ""),
    rationale: row.rationale === null || row.rationale === undefined ? null : String(row.rationale),
    metadata: objectField(row.metadata),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function normalizeGuidancePath(value: unknown): string {
  const path = stringField(value) ?? "guidance.md";
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,160}$/.test(path) || path.includes("..")) {
    throw new TriageError(422, "invalid_guidance_path", "Guidance path is invalid");
  }
  return path;
}

function numberField(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

export function createPostgresTriageStore(ctx: Pick<PluginContext, "db">): TriageStore {
  const namespace = ctx.db.namespace;
  const queues = table(namespace, "triage_queues");
  const states = table(namespace, "triage_queue_states");
  const transitions = table(namespace, "triage_queue_transitions");
  const chats = table(namespace, "triage_queue_chats");
  const docs = table(namespace, "triage_guidance_docs");
  const revisions = table(namespace, "triage_guidance_doc_revisions");
  const proposals = table(namespace, "triage_guidance_proposals");
  const items = table(namespace, "triage_items");
  const events = table(namespace, "triage_item_events");
  const actions = table(namespace, "triage_transition_actions");

  async function getQueueById(companyId: string, queueId: string): Promise<TriageQueue | null> {
    const rows = await ctx.db.query<Record<string, unknown>>(
      `SELECT * FROM ${queues} WHERE company_id = $1 AND id = $2 LIMIT 1`,
      [companyId, queueId],
    );
    return rows[0] ? queueFromRow(rows[0]) : null;
  }

  async function recalculateQueueCounts(companyId: string, queueId: string): Promise<void> {
    await ctx.db.execute(
      `UPDATE ${queues}
       SET active_item_count = (
         SELECT count(*)::int FROM ${items}
         WHERE company_id = $1 AND queue_id = $2 AND status = 'active'
       ),
       archived_item_count = (
         SELECT count(*)::int FROM ${items}
         WHERE company_id = $1 AND queue_id = $2 AND status = 'archived'
       ),
       updated_at = now()
       WHERE company_id = $1 AND id = $2`,
      [companyId, queueId],
    );
  }

  async function getItemById(companyId: string, itemId: string): Promise<TriageItem | null> {
    const rows = await ctx.db.query<Record<string, unknown>>(
      `SELECT * FROM ${items} WHERE company_id = $1 AND id = $2 LIMIT 1`,
      [companyId, itemId],
    );
    return rows[0] ? itemFromRow(rows[0]) : null;
  }

  return {
    async listQueues(companyId) {
      const rows = await ctx.db.query<Record<string, unknown>>(
        `SELECT * FROM ${queues} WHERE company_id = $1 ORDER BY updated_at DESC`,
        [companyId],
      );
      return rows.map(queueFromRow);
    },

    async getQueue(companyId, queueKey) {
      const rows = await ctx.db.query<Record<string, unknown>>(
        `SELECT * FROM ${queues} WHERE company_id = $1 AND queue_key = $2 LIMIT 1`,
        [companyId, queueKey],
      );
      return rows[0] ? queueFromRow(rows[0]) : null;
    },

    async getQueueById(companyId, queueId) {
      return getQueueById(companyId, queueId);
    },

    async createQueue(input) {
      const id = randomUUID();
      await ctx.db.execute(
        `INSERT INTO ${queues} (id, company_id, queue_key, title, description)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (company_id, queue_key) DO NOTHING`,
        [id, input.companyId, input.queueKey, input.title, input.description ?? null],
      );
      const queue = await this.getQueue(input.companyId, input.queueKey);
      if (!queue) throw new TriageError(500, "queue_create_failed", "Queue was not created");
      return { queue, created: queue.id === id };
    },

    async ensureQueueDefaults(queue) {
      const defaultStates = [
        ["draft", "Draft", false, "active", 10],
        ["approved", "Approved", false, "active", 20],
        ["rejected", "Rejected", false, "active", 30],
        ["done", "Done", true, "archived", 40],
      ] as const;
      for (const [stateKey, displayName, terminal, visibility, sortOrder] of defaultStates) {
        await ctx.db.execute(
          `INSERT INTO ${states}
             (id, company_id, queue_id, state_key, display_name, is_terminal, visibility, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (queue_id, state_key) DO NOTHING`,
          [randomUUID(), queue.companyId, queue.id, stateKey, displayName, terminal, visibility, sortOrder],
        );
      }

      const defaultTransitions = [
        ["draft", "approved", "Approve"],
        ["draft", "rejected", "Reject"],
        ["approved", "done", "Mark Done"],
        ["rejected", "done", "Mark Done"],
      ] as const;
      for (const [fromState, toState, label] of defaultTransitions) {
        await ctx.db.execute(
          `INSERT INTO ${transitions}
             (id, company_id, queue_id, from_state_key, to_state_key, label)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (queue_id, from_state_key, to_state_key) DO NOTHING`,
          [randomUUID(), queue.companyId, queue.id, fromState, toState, label],
        );
      }

      const existingDocs = await ctx.db.query<Record<string, unknown>>(
        `SELECT id FROM ${docs} WHERE company_id = $1 AND queue_id = $2 AND path = 'guidance.md' LIMIT 1`,
        [queue.companyId, queue.id],
      );
      if (existingDocs[0]) return;

      const docId = randomUUID();
      const revisionId = randomUUID();
      const content = `# ${queue.title} Guidance\n\nCapture queue-specific policy, taste, examples, and handling rules here.\n`;
      await ctx.db.execute(
        `INSERT INTO ${docs}
           (id, company_id, queue_id, path, title, current_revision_id)
         VALUES ($1, $2, $3, 'guidance.md', 'Guidance', $4)
         ON CONFLICT (queue_id, path) DO NOTHING`,
        [docId, queue.companyId, queue.id, revisionId],
      );
      const docRows = await ctx.db.query<Record<string, unknown>>(
        `SELECT id FROM ${docs} WHERE company_id = $1 AND queue_id = $2 AND path = 'guidance.md' LIMIT 1`,
        [queue.companyId, queue.id],
      );
      if (String(docRows[0]?.id ?? "") !== docId) return;
      await ctx.db.execute(
        `INSERT INTO ${revisions}
           (id, company_id, queue_id, doc_id, content, content_hash, summary)
         VALUES ($1, $2, $3, $4, $5, $6, 'Initial guidance document')
         ON CONFLICT DO NOTHING`,
        [revisionId, queue.companyId, queue.id, docId, content, createHash("sha256").update(content).digest("hex")],
      );
    },

    async updateQueue(input) {
      await ctx.db.execute(
        `UPDATE ${queues}
         SET title = COALESCE($3, title),
             description = COALESCE($4, description),
             status = COALESCE($5, status),
             updated_at = now()
         WHERE company_id = $1 AND queue_key = $2`,
        [input.companyId, input.queueKey, input.title ?? null, input.description ?? null, input.status ?? null],
      );
      const queue = await this.getQueue(input.companyId, input.queueKey);
      if (!queue) throw new TriageError(404, "queue_not_found", "Queue not found");
      return queue;
    },

    async archiveQueue(companyId, queueKey) {
      return this.updateQueue({ companyId, queueKey, status: "archived" });
    },

    async listItems(companyId, queueKey) {
      const queue = await this.getQueue(companyId, queueKey);
      if (!queue) throw new TriageError(404, "queue_not_found", "Queue not found");
      const rows = await ctx.db.query<Record<string, unknown>>(
        `SELECT * FROM ${items} WHERE company_id = $1 AND queue_id = $2 ORDER BY updated_at DESC`,
        [companyId, queue.id],
      );
      return rows.map(itemFromRow);
    },

    async getItem(companyId, itemId) {
      return getItemById(companyId, itemId);
    },

    async findItemsByKeys(input) {
      if (!input.itemKey && !input.idempotencyKey) return [];
      const rows = await ctx.db.query<Record<string, unknown>>(
        `SELECT * FROM ${items}
         WHERE company_id = $1
           AND queue_id = $2
           AND (
             ($3::text IS NOT NULL AND item_key = $3)
             OR ($4::text IS NOT NULL AND idempotency_key = $4)
           )
         LIMIT 2`,
        [input.companyId, input.queueId, input.itemKey ?? null, input.idempotencyKey ?? null],
      );
      return rows.map(itemFromRow);
    },

    async insertItem(input) {
      const id = randomUUID();
      await ctx.db.execute(
        `INSERT INTO ${items}
           (id, company_id, queue_id, item_key, idempotency_key, title, content_format, content, properties, state_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)`,
        [
          id,
          input.companyId,
          input.queueId,
          input.itemKey ?? null,
          input.idempotencyKey ?? null,
          input.title,
          input.contentFormat,
          input.content,
          JSON.stringify(input.properties),
          input.stateKey,
        ],
      );
      await recalculateQueueCounts(input.companyId, input.queueId);
      const item = await getItemById(input.companyId, id);
      if (!item) throw new TriageError(500, "item_create_failed", "Item was not created");
      return item;
    },

    async updateItem(input) {
      await ctx.db.execute(
        `UPDATE ${items}
         SET item_key = COALESCE($3, item_key),
             idempotency_key = COALESCE($4, idempotency_key),
             title = COALESCE($5, title),
             content_format = COALESCE($6, content_format),
             content = COALESCE($7, content),
             properties = COALESCE($8::jsonb, properties),
             state_key = COALESCE($9, state_key),
             status = COALESCE($10, status),
             linked_queue_chat_id = COALESCE($11::uuid, linked_queue_chat_id),
             linked_work_issue_id = COALESCE($12::uuid, linked_work_issue_id),
             revision = revision + 1,
             last_ingested_at = now(),
             updated_at = now()
         WHERE company_id = $1 AND id = $2`,
        [
          input.companyId,
          input.itemId,
          input.itemKey ?? null,
          input.idempotencyKey ?? null,
          input.title ?? null,
          input.contentFormat ?? null,
          input.content ?? null,
          input.properties === undefined || input.properties === null ? null : JSON.stringify(input.properties),
          input.stateKey ?? null,
          input.status ?? null,
          input.linkedQueueChatId ?? null,
          input.linkedWorkIssueId ?? null,
        ],
      );
      const item = await getItemById(input.companyId, input.itemId);
      if (!item) throw new TriageError(404, "item_not_found", "Item not found");
      await recalculateQueueCounts(input.companyId, item.queueId);
      return item;
    },

    async archiveItem(companyId, itemId) {
      return this.updateItem({ companyId, itemId, status: "archived" });
    },

    async upsertTransitionAction(input) {
      const id = randomUUID();
      const action = parseTransitionIssueAction(input.action);
      await ctx.db.execute(
        `INSERT INTO ${actions}
           (id, company_id, queue_id, action_key, from_state_key, to_state_key, action_type, enabled, template)
         VALUES ($1, $2, $3, $4, $5, $6, 'create_or_update_issue', $7, $8::jsonb)
         ON CONFLICT (queue_id, action_key) DO UPDATE
         SET from_state_key = EXCLUDED.from_state_key,
             to_state_key = EXCLUDED.to_state_key,
             action_type = EXCLUDED.action_type,
             enabled = EXCLUDED.enabled,
             template = EXCLUDED.template,
             updated_at = now()`,
        [
          id,
          input.companyId,
          input.queueId,
          input.actionKey,
          input.fromStateKey,
          input.toStateKey,
          input.enabled ?? true,
          JSON.stringify(action),
        ],
      );
      const rows = await ctx.db.query<Record<string, unknown>>(
        `SELECT * FROM ${actions} WHERE company_id = $1 AND queue_id = $2 AND action_key = $3 LIMIT 1`,
        [input.companyId, input.queueId, input.actionKey],
      );
      if (!rows[0]) throw new TriageError(500, "transition_action_save_failed", "Transition action was not saved");
      return actionFromRow(rows[0]);
    },

    async listTransitionActions(input) {
      const rows = await ctx.db.query<Record<string, unknown>>(
        `SELECT * FROM ${actions}
         WHERE company_id = $1
           AND queue_id = $2
           AND ($3::text IS NULL OR from_state_key = $3)
           AND ($4::text IS NULL OR to_state_key = $4)
           AND ($5::text IS NULL OR action_key = $5)
         ORDER BY created_at ASC`,
        [
          input.companyId,
          input.queueId,
          input.fromStateKey ?? null,
          input.toStateKey ?? null,
          input.actionKey ?? null,
        ],
      );
      return rows.map(actionFromRow);
    },

    async recordItemEvent(input) {
      const id = randomUUID();
      await ctx.db.execute(
        `INSERT INTO ${events}
           (id, company_id, queue_id, item_id, event_type, from_state_key, to_state_key,
            actor_type, actor_id, actor_run_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)`,
        [
          id,
          input.companyId,
          input.queueId,
          input.itemId,
          input.eventType,
          input.fromStateKey ?? null,
          input.toStateKey ?? null,
          input.actor?.actorType ?? null,
          input.actor?.actorId ?? null,
          input.actor?.actorRunId ?? null,
          JSON.stringify(input.metadata ?? {}),
        ],
      );
      const rows = await ctx.db.query<Record<string, unknown>>(
        `SELECT * FROM ${events} WHERE company_id = $1 AND id = $2 LIMIT 1`,
        [input.companyId, id],
      );
      if (rows[0]) return eventFromRow(rows[0]);
      return {
        id,
        companyId: input.companyId,
        queueId: input.queueId,
        itemId: input.itemId,
        eventType: input.eventType,
        fromStateKey: input.fromStateKey ?? null,
        toStateKey: input.toStateKey ?? null,
        actorType: input.actor?.actorType ?? null,
        actorId: input.actor?.actorId ?? null,
        actorRunId: input.actor?.actorRunId ?? null,
        metadata: input.metadata ?? {},
        createdAt: nowIso(),
      };
    },

    async listItemEvents(companyId, itemId) {
      const rows = await ctx.db.query<Record<string, unknown>>(
        `SELECT * FROM ${events}
         WHERE company_id = $1 AND item_id = $2
         ORDER BY created_at DESC`,
        [companyId, itemId],
      );
      return rows.map(eventFromRow);
    },

    async getActiveQueueChat(companyId, queueId) {
      const rows = await ctx.db.query<Record<string, unknown>>(
        `SELECT * FROM ${chats}
         WHERE company_id = $1 AND queue_id = $2 AND status = 'active'
         ORDER BY updated_at DESC
         LIMIT 1`,
        [companyId, queueId],
      );
      return rows[0] ? chatFromRow(rows[0]) : null;
    },

    async createQueueChat(input) {
      const existing = await this.getActiveQueueChat(input.companyId, input.queueId);
      if (existing) return { chat: existing, created: false };
      const id = randomUUID();
      await ctx.db.execute(
        `INSERT INTO ${chats}
           (id, company_id, queue_id, hidden_issue_id, title, metadata)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)
         ON CONFLICT DO NOTHING`,
        [
          id,
          input.companyId,
          input.queueId,
          input.hiddenIssueId ?? null,
          input.title ?? null,
          JSON.stringify(input.metadata ?? {}),
        ],
      );
      const chat = await this.getActiveQueueChat(input.companyId, input.queueId);
      if (!chat) throw new TriageError(500, "queue_chat_create_failed", "Queue chat was not created");
      return { chat, created: chat.id === id };
    },

    async updateQueueChat(input) {
      await ctx.db.execute(
        `UPDATE ${chats}
         SET hidden_issue_id = COALESCE($3::uuid, hidden_issue_id),
             title = COALESCE($4, title),
             status = COALESCE($5, status),
             metadata = COALESCE($6::jsonb, metadata),
             updated_at = now()
         WHERE company_id = $1 AND id = $2`,
        [
          input.companyId,
          input.chatId,
          input.hiddenIssueId ?? null,
          input.title ?? null,
          input.status ?? null,
          input.metadata === undefined ? null : JSON.stringify(input.metadata),
        ],
      );
      const rows = await ctx.db.query<Record<string, unknown>>(
        `SELECT * FROM ${chats} WHERE company_id = $1 AND id = $2 LIMIT 1`,
        [input.companyId, input.chatId],
      );
      if (!rows[0]) throw new TriageError(404, "queue_chat_not_found", "Queue chat not found");
      return chatFromRow(rows[0]);
    },

    async listGuidanceDocs(companyId, queueId) {
      const rows = await ctx.db.query<Record<string, unknown>>(
        `SELECT d.*, r.content, r.content_hash, r.summary
         FROM ${docs} d
         LEFT JOIN ${revisions} r
           ON r.company_id = d.company_id AND r.id = d.current_revision_id
         WHERE d.company_id = $1 AND d.queue_id = $2 AND d.status = 'active'
         ORDER BY d.path ASC`,
        [companyId, queueId],
      );
      return rows.map(guidanceDocFromRow);
    },

    async getGuidanceDocByPath(companyId, queueId, path) {
      const rows = await ctx.db.query<Record<string, unknown>>(
        `SELECT d.*, r.content, r.content_hash, r.summary
         FROM ${docs} d
         LEFT JOIN ${revisions} r
           ON r.company_id = d.company_id AND r.id = d.current_revision_id
         WHERE d.company_id = $1 AND d.queue_id = $2 AND d.path = $3
         LIMIT 1`,
        [companyId, queueId, path],
      );
      return rows[0] ? guidanceDocFromRow(rows[0]) : null;
    },

    async upsertGuidanceRevision(input) {
      const existingDoc = await this.getGuidanceDocByPath(input.companyId, input.queueId, input.path);
      const docId = existingDoc?.id ?? randomUUID();
      const revisionId = randomUUID();
      const contentHash = createHash("sha256").update(input.content).digest("hex");
      if (!existingDoc) {
        await ctx.db.execute(
          `INSERT INTO ${docs}
             (id, company_id, queue_id, path, title, current_revision_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [docId, input.companyId, input.queueId, input.path, input.title, revisionId],
        );
      }
      await ctx.db.execute(
        `INSERT INTO ${revisions}
           (id, company_id, queue_id, doc_id, content, content_hash, summary, actor_type, actor_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
        [
          revisionId,
          input.companyId,
          input.queueId,
          docId,
          input.content,
          contentHash,
          input.summary ?? null,
          input.actor?.actorType ?? null,
          input.actor?.actorId ?? null,
          JSON.stringify(input.metadata ?? {}),
        ],
      );
      await ctx.db.execute(
        `UPDATE ${docs}
         SET title = $4, current_revision_id = $5, updated_at = now()
         WHERE company_id = $1 AND queue_id = $2 AND id = $3`,
        [input.companyId, input.queueId, docId, input.title, revisionId],
      );
      const doc = await this.getGuidanceDocByPath(input.companyId, input.queueId, input.path);
      const revisionRows = await ctx.db.query<Record<string, unknown>>(
        `SELECT * FROM ${revisions} WHERE company_id = $1 AND id = $2 LIMIT 1`,
        [input.companyId, revisionId],
      );
      if (!doc || !revisionRows[0]) {
        throw new TriageError(500, "guidance_revision_failed", "Guidance revision was not saved");
      }
      return { doc, revision: guidanceRevisionFromRow(revisionRows[0]) };
    },

    async listGuidanceProposals(companyId, queueId) {
      const rows = await ctx.db.query<Record<string, unknown>>(
        `SELECT * FROM ${proposals}
         WHERE company_id = $1 AND queue_id = $2
         ORDER BY updated_at DESC`,
        [companyId, queueId],
      );
      return rows.map(guidanceProposalFromRow);
    },

    async getGuidanceProposal(companyId, proposalId) {
      const rows = await ctx.db.query<Record<string, unknown>>(
        `SELECT * FROM ${proposals} WHERE company_id = $1 AND id = $2 LIMIT 1`,
        [companyId, proposalId],
      );
      return rows[0] ? guidanceProposalFromRow(rows[0]) : null;
    },

    async createGuidanceProposal(input) {
      const id = randomUUID();
      await ctx.db.execute(
        `INSERT INTO ${proposals}
           (id, company_id, queue_id, item_id, target_doc_id, proposed_content, rationale, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
        [
          id,
          input.companyId,
          input.queueId,
          input.itemId ?? null,
          input.targetDocId ?? null,
          input.proposedContent,
          input.rationale ?? null,
          JSON.stringify(input.metadata ?? {}),
        ],
      );
      const proposal = await this.getGuidanceProposal(input.companyId, id);
      if (!proposal) throw new TriageError(500, "guidance_proposal_create_failed", "Guidance proposal was not created");
      return proposal;
    },

    async updateGuidanceProposal(input) {
      await ctx.db.execute(
        `UPDATE ${proposals}
         SET status = COALESCE($3, status),
             proposed_content = COALESCE($4, proposed_content),
             rationale = COALESCE($5, rationale),
             metadata = COALESCE($6::jsonb, metadata),
             updated_at = now()
         WHERE company_id = $1 AND id = $2`,
        [
          input.companyId,
          input.proposalId,
          input.status ?? null,
          input.proposedContent ?? null,
          input.rationale ?? null,
          input.metadata === undefined ? null : JSON.stringify(input.metadata),
        ],
      );
      const proposal = await this.getGuidanceProposal(input.companyId, input.proposalId);
      if (!proposal) throw new TriageError(404, "guidance_proposal_not_found", "Guidance proposal not found");
      return proposal;
    },
  };
}

export function createInMemoryTriageStore(): TriageStore {
  const queues = new Map<string, TriageQueue>();
  const items = new Map<string, TriageItem>();
  const events = new Map<string, TriageItemEvent>();
  const actions = new Map<string, TriageTransitionAction>();
  const chats = new Map<string, TriageQueueChat>();
  const docs = new Map<string, TriageGuidanceDoc>();
  const revisions = new Map<string, TriageGuidanceRevision>();
  const proposals = new Map<string, TriageGuidanceProposal>();
  const defaultedQueues = new Set<string>();

  function queueIndex(companyId: string, queueKey: string): string {
    return `${companyId}:${queueKey}`;
  }

  function cloneQueue(queue: TriageQueue): TriageQueue {
    return { ...queue };
  }

  function cloneItem(item: TriageItem): TriageItem {
    return { ...item, properties: { ...item.properties } };
  }

  function cloneAction(action: TriageTransitionAction): TriageTransitionAction {
    return { ...action, action: { ...action.action, template: { ...action.action.template } } };
  }

  function cloneChat(chat: TriageQueueChat): TriageQueueChat {
    return { ...chat, metadata: { ...chat.metadata } };
  }

  function cloneDoc(doc: TriageGuidanceDoc): TriageGuidanceDoc {
    return { ...doc, metadata: { ...doc.metadata } };
  }

  function cloneRevision(revision: TriageGuidanceRevision): TriageGuidanceRevision {
    return { ...revision, metadata: { ...revision.metadata } };
  }

  function cloneProposal(proposal: TriageGuidanceProposal): TriageGuidanceProposal {
    return { ...proposal, metadata: { ...proposal.metadata } };
  }

  function recalculateCounts(queueId: string): void {
    const queue = [...queues.values()].find((candidate) => candidate.id === queueId);
    if (!queue) return;
    const queueItems = [...items.values()].filter((item) => item.queueId === queueId);
    queue.activeItemCount = queueItems.filter((item) => item.status === "active").length;
    queue.archivedItemCount = queueItems.filter((item) => item.status === "archived").length;
    queue.updatedAt = nowIso();
  }

  return {
    async listQueues(companyId) {
      return [...queues.values()]
        .filter((queue) => queue.companyId === companyId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map(cloneQueue);
    },

    async getQueue(companyId, queueKey) {
      const queue = queues.get(queueIndex(companyId, queueKey));
      return queue ? cloneQueue(queue) : null;
    },

    async getQueueById(companyId, queueId) {
      const queue = [...queues.values()].find((candidate) =>
        candidate.companyId === companyId && candidate.id === queueId);
      return queue ? cloneQueue(queue) : null;
    },

    async createQueue(input) {
      const index = queueIndex(input.companyId, input.queueKey);
      const existing = queues.get(index);
      if (existing) return { queue: cloneQueue(existing), created: false };
      const timestamp = nowIso();
      const queue: TriageQueue = {
        id: randomUUID(),
        companyId: input.companyId,
        queueKey: input.queueKey,
        title: input.title,
        description: input.description ?? null,
        status: "active",
        defaultStateKey: "draft",
        activeItemCount: 0,
        archivedItemCount: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      queues.set(index, queue);
      return { queue: cloneQueue(queue), created: true };
    },

    async ensureQueueDefaults(queue) {
      if (!docs.has(`${queue.id}:guidance.md`)) {
        const timestamp = nowIso();
        const revisionId = randomUUID();
        const content = `# ${queue.title} Guidance\n\nCapture queue-specific policy, taste, examples, and handling rules here.\n`;
        const doc: TriageGuidanceDoc = {
          id: randomUUID(),
          companyId: queue.companyId,
          queueId: queue.id,
          path: "guidance.md",
          title: "Guidance",
          status: "active",
          currentRevisionId: revisionId,
          content,
          contentHash: createHash("sha256").update(content).digest("hex"),
          summary: "Initial guidance document",
          metadata: {},
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        const revision: TriageGuidanceRevision = {
          id: revisionId,
          companyId: queue.companyId,
          queueId: queue.id,
          docId: doc.id,
          content,
          contentHash: doc.contentHash,
          summary: doc.summary,
          actorType: null,
          actorId: null,
          metadata: {},
          createdAt: timestamp,
        };
        docs.set(`${queue.id}:guidance.md`, doc);
        revisions.set(revisionId, revision);
      }
      defaultedQueues.add(queue.id);
    },

    async updateQueue(input) {
      const index = queueIndex(input.companyId, input.queueKey);
      const queue = queues.get(index);
      if (!queue) throw new TriageError(404, "queue_not_found", "Queue not found");
      if (input.title !== undefined && input.title !== null) queue.title = input.title;
      if (input.description !== undefined) queue.description = input.description;
      if (input.status) queue.status = input.status;
      queue.updatedAt = nowIso();
      return cloneQueue(queue);
    },

    async archiveQueue(companyId, queueKey) {
      return this.updateQueue({ companyId, queueKey, status: "archived" });
    },

    async listItems(companyId, queueKey) {
      const queue = queues.get(queueIndex(companyId, queueKey));
      if (!queue) throw new TriageError(404, "queue_not_found", "Queue not found");
      return [...items.values()]
        .filter((item) => item.companyId === companyId && item.queueId === queue.id)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map(cloneItem);
    },

    async getItem(companyId, itemId) {
      const item = items.get(itemId);
      return item && item.companyId === companyId ? cloneItem(item) : null;
    },

    async findItemsByKeys(input) {
      if (!input.itemKey && !input.idempotencyKey) return [];
      return [...items.values()]
        .filter((item) => item.companyId === input.companyId && item.queueId === input.queueId)
        .filter((item) =>
          (input.itemKey ? item.itemKey === input.itemKey : false)
          || (input.idempotencyKey ? item.idempotencyKey === input.idempotencyKey : false))
        .slice(0, 2)
        .map(cloneItem);
    },

    async insertItem(input) {
      const timestamp = nowIso();
      const item: TriageItem = {
        id: randomUUID(),
        companyId: input.companyId,
        queueId: input.queueId,
        itemKey: input.itemKey ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        title: input.title,
        contentFormat: input.contentFormat,
        content: input.content,
        properties: { ...input.properties },
        stateKey: input.stateKey,
        status: "active",
        linkedQueueChatId: null,
        linkedWorkIssueId: null,
        revision: 1,
        lastIngestedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      items.set(item.id, item);
      recalculateCounts(item.queueId);
      return cloneItem(item);
    },

    async updateItem(input) {
      const item = items.get(input.itemId);
      if (!item || item.companyId !== input.companyId) {
        throw new TriageError(404, "item_not_found", "Item not found");
      }
      const conflicting = [...items.values()].find((candidate) =>
        candidate.id !== item.id
        && candidate.queueId === item.queueId
        && (
          (input.itemKey ? candidate.itemKey === input.itemKey : false)
          || (input.idempotencyKey ? candidate.idempotencyKey === input.idempotencyKey : false)
        ));
      if (conflicting) {
        throw new TriageError(409, "item_key_conflict", "itemKey or idempotencyKey matches a different queue item");
      }
      if (input.itemKey !== undefined && input.itemKey !== null) item.itemKey = input.itemKey;
      if (input.idempotencyKey !== undefined && input.idempotencyKey !== null) {
        item.idempotencyKey = input.idempotencyKey;
      }
      if (input.title !== undefined && input.title !== null) item.title = input.title;
      if (input.contentFormat !== undefined && input.contentFormat !== null) item.contentFormat = input.contentFormat;
      if (input.content !== undefined && input.content !== null) item.content = input.content;
      if (input.properties !== undefined && input.properties !== null) item.properties = { ...input.properties };
      if (input.stateKey !== undefined && input.stateKey !== null) item.stateKey = input.stateKey;
      if (input.status) item.status = input.status;
      if (input.linkedQueueChatId !== undefined && input.linkedQueueChatId !== null) {
        item.linkedQueueChatId = input.linkedQueueChatId;
      }
      if (input.linkedWorkIssueId !== undefined && input.linkedWorkIssueId !== null) {
        item.linkedWorkIssueId = input.linkedWorkIssueId;
      }
      item.revision += 1;
      item.lastIngestedAt = nowIso();
      item.updatedAt = item.lastIngestedAt;
      recalculateCounts(item.queueId);
      return cloneItem(item);
    },

    async archiveItem(companyId, itemId) {
      return this.updateItem({ companyId, itemId, status: "archived" });
    },

    async upsertTransitionAction(input) {
      const timestamp = nowIso();
      const index = `${input.queueId}:${input.actionKey}`;
      const existing = actions.get(index);
      const action: TriageTransitionAction = {
        id: existing?.id ?? randomUUID(),
        companyId: input.companyId,
        queueId: input.queueId,
        actionKey: input.actionKey,
        fromStateKey: input.fromStateKey,
        toStateKey: input.toStateKey,
        actionType: "create_or_update_issue",
        enabled: input.enabled ?? existing?.enabled ?? true,
        action: parseTransitionIssueAction(input.action),
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
      };
      actions.set(index, action);
      return cloneAction(action);
    },

    async listTransitionActions(input) {
      return [...actions.values()]
        .filter((action) => action.companyId === input.companyId && action.queueId === input.queueId)
        .filter((action) => input.fromStateKey ? action.fromStateKey === input.fromStateKey : true)
        .filter((action) => input.toStateKey ? action.toStateKey === input.toStateKey : true)
        .filter((action) => input.actionKey ? action.actionKey === input.actionKey : true)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map(cloneAction);
    },

    async recordItemEvent(input) {
      const event: TriageItemEvent = {
        id: randomUUID(),
        companyId: input.companyId,
        queueId: input.queueId,
        itemId: input.itemId,
        eventType: input.eventType,
        fromStateKey: input.fromStateKey ?? null,
        toStateKey: input.toStateKey ?? null,
        actorType: input.actor?.actorType ?? null,
        actorId: input.actor?.actorId ?? null,
        actorRunId: input.actor?.actorRunId ?? null,
        metadata: input.metadata ?? {},
        createdAt: nowIso(),
      };
      events.set(event.id, event);
      return { ...event, metadata: { ...event.metadata } };
    },

    async listItemEvents(companyId, itemId) {
      return [...events.values()]
        .filter((event) => event.companyId === companyId && event.itemId === itemId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((event) => ({ ...event, metadata: { ...event.metadata } }));
    },

    async getActiveQueueChat(companyId, queueId) {
      const chat = [...chats.values()]
        .filter((candidate) =>
          candidate.companyId === companyId && candidate.queueId === queueId && candidate.status === "active")
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
      return chat ? cloneChat(chat) : null;
    },

    async createQueueChat(input) {
      const existing = await this.getActiveQueueChat(input.companyId, input.queueId);
      if (existing) return { chat: existing, created: false };
      const timestamp = nowIso();
      const chat: TriageQueueChat = {
        id: randomUUID(),
        companyId: input.companyId,
        queueId: input.queueId,
        hiddenIssueId: input.hiddenIssueId ?? null,
        title: input.title ?? null,
        status: "active",
        metadata: { ...(input.metadata ?? {}) },
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      chats.set(chat.id, chat);
      return { chat: cloneChat(chat), created: true };
    },

    async updateQueueChat(input) {
      const chat = chats.get(input.chatId);
      if (!chat || chat.companyId !== input.companyId) {
        throw new TriageError(404, "queue_chat_not_found", "Queue chat not found");
      }
      if (input.hiddenIssueId !== undefined && input.hiddenIssueId !== null) chat.hiddenIssueId = input.hiddenIssueId;
      if (input.title !== undefined) chat.title = input.title;
      if (input.status) chat.status = input.status;
      if (input.metadata !== undefined) chat.metadata = { ...input.metadata };
      chat.updatedAt = nowIso();
      return cloneChat(chat);
    },

    async listGuidanceDocs(companyId, queueId) {
      return [...docs.values()]
        .filter((doc) => doc.companyId === companyId && doc.queueId === queueId && doc.status === "active")
        .sort((a, b) => a.path.localeCompare(b.path))
        .map(cloneDoc);
    },

    async getGuidanceDocByPath(companyId, queueId, path) {
      const doc = docs.get(`${queueId}:${path}`);
      return doc && doc.companyId === companyId ? cloneDoc(doc) : null;
    },

    async upsertGuidanceRevision(input) {
      const timestamp = nowIso();
      const key = `${input.queueId}:${input.path}`;
      const existing = docs.get(key);
      const revision: TriageGuidanceRevision = {
        id: randomUUID(),
        companyId: input.companyId,
        queueId: input.queueId,
        docId: existing?.id ?? randomUUID(),
        content: input.content,
        contentHash: createHash("sha256").update(input.content).digest("hex"),
        summary: input.summary ?? null,
        actorType: input.actor?.actorType ?? null,
        actorId: input.actor?.actorId ?? null,
        metadata: { ...(input.metadata ?? {}) },
        createdAt: timestamp,
      };
      const doc: TriageGuidanceDoc = {
        id: revision.docId,
        companyId: input.companyId,
        queueId: input.queueId,
        path: input.path,
        title: input.title,
        status: existing?.status ?? "active",
        currentRevisionId: revision.id,
        content: input.content,
        contentHash: revision.contentHash,
        summary: revision.summary,
        metadata: existing ? { ...existing.metadata } : {},
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
      };
      revisions.set(revision.id, revision);
      docs.set(key, doc);
      return { doc: cloneDoc(doc), revision: cloneRevision(revision) };
    },

    async listGuidanceProposals(companyId, queueId) {
      return [...proposals.values()]
        .filter((proposal) => proposal.companyId === companyId && proposal.queueId === queueId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map(cloneProposal);
    },

    async getGuidanceProposal(companyId, proposalId) {
      const proposal = proposals.get(proposalId);
      return proposal && proposal.companyId === companyId ? cloneProposal(proposal) : null;
    },

    async createGuidanceProposal(input) {
      const timestamp = nowIso();
      const proposal: TriageGuidanceProposal = {
        id: randomUUID(),
        companyId: input.companyId,
        queueId: input.queueId,
        itemId: input.itemId ?? null,
        targetDocId: input.targetDocId ?? null,
        status: "proposed",
        proposedContent: input.proposedContent,
        rationale: input.rationale ?? null,
        metadata: { ...(input.metadata ?? {}) },
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      proposals.set(proposal.id, proposal);
      return cloneProposal(proposal);
    },

    async updateGuidanceProposal(input) {
      const proposal = proposals.get(input.proposalId);
      if (!proposal || proposal.companyId !== input.companyId) {
        throw new TriageError(404, "guidance_proposal_not_found", "Guidance proposal not found");
      }
      if (input.status) proposal.status = input.status;
      if (input.proposedContent !== undefined && input.proposedContent !== null) {
        proposal.proposedContent = input.proposedContent;
      }
      if (input.rationale !== undefined) proposal.rationale = input.rationale;
      if (input.metadata !== undefined) proposal.metadata = { ...input.metadata };
      proposal.updatedAt = nowIso();
      return cloneProposal(proposal);
    },
  };
}

export interface TriageAssistantContext {
  queue: TriageQueue;
  item: TriageItem;
  guidanceDocs: TriageGuidanceDoc[];
  prompt: string;
}

function ensureString(value: unknown, code: string, message: string): string {
  const out = stringField(value);
  if (!out) throw new TriageError(400, code, message);
  return out;
}

async function requireItemWithQueue(store: TriageStore, companyId: string, itemId: string) {
  const item = await store.getItem(companyId, itemId);
  if (!item) throw new TriageError(404, "item_not_found", "Item not found");
  const queue = await store.getQueueById(companyId, item.queueId);
  if (!queue) throw new TriageError(404, "queue_not_found", "Queue not found");
  await store.ensureQueueDefaults(queue);
  return { item, queue };
}

function proposalStatusFromParams(value: unknown): TriageGuidanceProposalStatus | undefined {
  if (value === "proposed" || value === "revised" || value === "accepted" || value === "rejected") return value;
  return undefined;
}

function appendGuidanceSuggestion(currentContent: string, suggestion: string): string {
  const heading = "## Proposed Learning";
  const separator = currentContent.trim().length > 0 ? "\n\n" : "";
  return `${currentContent.trimEnd()}${separator}${heading}\n\n${suggestion.trim()}\n`;
}

function formatAssistantPrompt(input: {
  queue: TriageQueue;
  item: TriageItem;
  guidanceDocs: TriageGuidanceDoc[];
  message: string;
}): string {
  const guidance = input.guidanceDocs.length > 0
    ? input.guidanceDocs.map((doc) => [
      `--- ${doc.path} (${doc.title}) ---`,
      doc.content.trim() || "(empty)",
    ].join("\n")).join("\n\n")
    : "(no guidance documents)";
  return [
    "You are the managed assistant for a Paperclip Triage queue.",
    "Use only the provided company-scoped queue, item, and guidance context.",
    "",
    `Queue: ${input.queue.title} (${input.queue.queueKey})`,
    input.queue.description ? `Queue description: ${input.queue.description}` : null,
    `Current state: ${input.item.stateKey}`,
    `Current item: ${input.item.title}`,
    `Item revision: ${input.item.revision}`,
    `Content format: ${input.item.contentFormat}`,
    "",
    "Item properties:",
    JSON.stringify(input.item.properties, null, 2),
    "",
    "Item content:",
    input.item.content || "(empty)",
    "",
    "Queue guidance:",
    guidance,
    "",
    "User message:",
    input.message,
  ].filter((line): line is string => line !== null).join("\n");
}

export function createTriageService(store: TriageStore) {
  return {
    async listQueues(params: Record<string, unknown>) {
      return store.listQueues(requireCompanyId(params.companyId));
    },

    async getQueue(params: Record<string, unknown>) {
      const companyId = requireCompanyId(params.companyId);
      const queueKey = normalizeQueueKey(params.queueKey);
      const queue = await store.getQueue(companyId, queueKey);
      if (!queue) throw new TriageError(404, "queue_not_found", "Queue not found");
      return queue;
    },

    async createQueue(params: Record<string, unknown>) {
      const companyId = requireCompanyId(params.companyId);
      const queueKey = normalizeQueueKey(params.queueKey);
      const title = stringField(params.title) ?? defaultQueueTitle(queueKey);
      const result = await store.createQueue({
        companyId,
        queueKey,
        title,
        description: stringField(params.description),
      });
      await store.ensureQueueDefaults(result.queue);
      return result;
    },

    async updateQueue(params: Record<string, unknown>) {
      const companyId = requireCompanyId(params.companyId);
      const status = params.status === "archived" || params.status === "active"
        ? params.status
        : undefined;
      return store.updateQueue({
        companyId,
        queueKey: normalizeQueueKey(params.queueKey),
        title: stringField(params.title),
        description: params.description === null ? null : stringField(params.description),
        status,
      });
    },

    async archiveQueue(params: Record<string, unknown>) {
      return store.archiveQueue(requireCompanyId(params.companyId), normalizeQueueKey(params.queueKey));
    },

    async listItems(params: Record<string, unknown>) {
      return store.listItems(requireCompanyId(params.companyId), normalizeQueueKey(params.queueKey));
    },

    async getItem(params: Record<string, unknown>) {
      const itemId = stringField(params.itemId);
      if (!itemId) throw new TriageError(400, "item_id_required", "itemId is required");
      const item = await store.getItem(requireCompanyId(params.companyId), itemId);
      if (!item) throw new TriageError(404, "item_not_found", "Item not found");
      return item;
    },

    async getAssistantContext(params: Record<string, unknown>): Promise<TriageAssistantContext> {
      const companyId = requireCompanyId(params.companyId);
      const itemId = ensureString(params.itemId, "item_id_required", "itemId is required");
      const message = typeof params.message === "string" ? params.message : "";
      const { item, queue } = await requireItemWithQueue(store, companyId, itemId);
      if (params.queueKey !== undefined && normalizeQueueKey(params.queueKey) !== queue.queueKey) {
        throw new TriageError(404, "item_not_in_queue", "Item does not belong to the requested queue");
      }
      const guidanceDocs = await store.listGuidanceDocs(companyId, queue.id);
      return {
        queue,
        item,
        guidanceDocs,
        prompt: formatAssistantPrompt({ queue, item, guidanceDocs, message }),
      };
    },

    async ensureQueueChat(params: Record<string, unknown>) {
      const companyId = requireCompanyId(params.companyId);
      const itemId = stringField(params.itemId);
      const queueKey = stringField(params.queueKey);
      let queue: TriageQueue | null = null;
      let item: TriageItem | null = null;
      if (itemId) {
        const resolved = await requireItemWithQueue(store, companyId, itemId);
        queue = resolved.queue;
        item = resolved.item;
      } else if (queueKey) {
        queue = await store.getQueue(companyId, normalizeQueueKey(queueKey));
        if (!queue) throw new TriageError(404, "queue_not_found", "Queue not found");
        await store.ensureQueueDefaults(queue);
      } else {
        throw new TriageError(400, "queue_or_item_required", "queueKey or itemId is required");
      }
      const result = await store.createQueueChat({
        companyId,
        queueId: queue.id,
        hiddenIssueId: stringField(params.hiddenIssueId),
        title: `Triage chat: ${queue.title}`,
      });
      if (item && item.linkedQueueChatId !== result.chat.id) {
        await store.updateItem({
          companyId,
          itemId: item.id,
          linkedQueueChatId: result.chat.id,
        });
      }
      return { ...result, queue, item };
    },

    async updateQueueChat(params: Record<string, unknown>) {
      const companyId = requireCompanyId(params.companyId);
      const chatId = ensureString(params.chatId, "queue_chat_id_required", "chatId is required");
      const existing = await store.updateQueueChat({
        companyId,
        chatId,
        hiddenIssueId: stringField(params.hiddenIssueId),
        title: stringField(params.title),
        status: params.status === "archived" || params.status === "active" ? params.status : undefined,
        metadata: params.metadata === undefined ? undefined : objectField(params.metadata),
      });
      return existing;
    },

    async listGuidanceDocs(params: Record<string, unknown>) {
      const companyId = requireCompanyId(params.companyId);
      const queue = await this.getQueue(params);
      return store.listGuidanceDocs(companyId, queue.id);
    },

    async listGuidanceProposals(params: Record<string, unknown>) {
      const companyId = requireCompanyId(params.companyId);
      const queue = await this.getQueue(params);
      return store.listGuidanceProposals(companyId, queue.id);
    },

    async listItemEvents(params: Record<string, unknown>) {
      const companyId = requireCompanyId(params.companyId);
      const itemId = ensureString(params.itemId, "item_id_required", "itemId is required");
      const item = await store.getItem(companyId, itemId);
      if (!item) throw new TriageError(404, "item_not_found", "Item not found");
      return store.listItemEvents(companyId, itemId);
    },

    async listTransitionActions(params: Record<string, unknown>) {
      const companyId = requireCompanyId(params.companyId);
      const queue = await this.getQueue(params);
      return store.listTransitionActions({
        companyId,
        queueId: queue.id,
        fromStateKey: stringField(params.fromStateKey),
        toStateKey: stringField(params.toStateKey),
        actionKey: stringField(params.actionKey),
      });
    },

    async upsertTransitionAction(params: Record<string, unknown>) {
      const companyId = requireCompanyId(params.companyId);
      const queue = await this.getQueue(params);
      return store.upsertTransitionAction({
        companyId,
        queueId: queue.id,
        actionKey: normalizeActionKey(params.actionKey),
        fromStateKey: normalizeStateKey(params.fromStateKey, "fromStateKey"),
        toStateKey: normalizeStateKey(params.toStateKey, "toStateKey"),
        action: parseTransitionIssueAction(params.action),
        enabled: params.enabled === undefined ? undefined : params.enabled === true,
      });
    },

    async transitionItem(
      params: Record<string, unknown>,
      ctx: Pick<PluginContext, "issues" | "manifest">,
      actor: TriageActor = {},
    ): Promise<TriageItemTransitionResult> {
      const companyId = requireCompanyId(params.companyId);
      const itemId = ensureString(params.itemId, "item_id_required", "itemId is required");
      const toStateKey = normalizeStateKey(params.toStateKey, "toStateKey");
      const { item, queue } = await requireItemWithQueue(store, companyId, itemId);
      const actionKey = stringField(params.actionKey);
      const fromStateKey = item.stateKey;
      const actions = (await store.listTransitionActions({
        companyId,
        queueId: queue.id,
        fromStateKey,
        toStateKey,
        actionKey,
      })).filter((action) => action.enabled);

      let linkedWorkIssueId = item.linkedWorkIssueId;
      const actionResults: TriageTransitionActionResult[] = [];
      const actionEvents: TriageItemEvent[] = [];
      for (const action of actions) {
        const result = await runIssueTransitionAction({
          ctx,
          queue,
          item,
          action,
          fromStateKey,
          toStateKey,
          linkedWorkIssueId,
          actor,
        });
        linkedWorkIssueId = result.issueId ?? linkedWorkIssueId;
        actionResults.push(result);
        actionEvents.push(await store.recordItemEvent({
          companyId,
          queueId: queue.id,
          itemId: item.id,
          eventType: "transition.action.executed",
          fromStateKey,
          toStateKey,
          actor,
          metadata: {
            actionKey: action.actionKey,
            actionType: action.actionType,
            mode: action.action.mode,
            result: result.result,
            issueId: result.issueId,
            commentCreated: result.commentCreated,
          },
        }));
      }

      const next = await store.updateItem({
        companyId,
        itemId: item.id,
        stateKey: toStateKey,
        linkedWorkIssueId,
      });
      const transitionEvent = await store.recordItemEvent({
        companyId,
        queueId: queue.id,
        itemId: item.id,
        eventType: "item.transitioned",
        fromStateKey,
        toStateKey,
        actor,
        metadata: {
          actionCount: actions.length,
          actionKeys: actions.map((action) => action.actionKey),
          linkedWorkIssueId,
        },
      });
      return {
        item: next,
        transitionEvent,
        actionEvents,
        actionResults,
      };
    },

    async ingestItem(params: Record<string, unknown>, actor: TriageActor = {}): Promise<IngestItemResult> {
      const input = parseIngestInput(params);
      let queue = await store.getQueue(input.companyId, input.queueKey);
      let createdQueue = false;

      if (!queue) {
        if (input.requireExistingQueue) {
          throw new TriageError(404, "queue_not_found", "Queue not found", { queueKey: input.queueKey });
        }
        const created = await store.createQueue({
          companyId: input.companyId,
          queueKey: input.queueKey,
          title: defaultQueueTitle(input.queueKey),
        });
        queue = created.queue;
        createdQueue = created.created;
      }
      await store.ensureQueueDefaults(queue);

      const matches = await store.findItemsByKeys({
        companyId: input.companyId,
        queueId: queue.id,
        itemKey: input.itemKey,
        idempotencyKey: input.idempotencyKey,
      });
      if (matches.length > 1) {
        throw new TriageError(
          409,
          "ambiguous_item_key",
          "itemKey and idempotencyKey match different queue items",
        );
      }

      const existing = matches[0] ?? null;
      const stateKey = input.initialStateKey ?? existing?.stateKey ?? queue.defaultStateKey;
      const item = existing
        ? await store.updateItem({
          companyId: input.companyId,
          itemId: existing.id,
          itemKey: input.itemKey,
          idempotencyKey: input.idempotencyKey,
          title: input.title,
          contentFormat: input.contentFormat,
          content: input.content,
          properties: input.properties,
          stateKey,
          status: "active",
        })
        : await store.insertItem({
          companyId: input.companyId,
          queueId: queue.id,
          itemKey: input.itemKey,
          idempotencyKey: input.idempotencyKey,
          title: input.title ?? "Untitled item",
          contentFormat: input.contentFormat ?? "markdown",
          content: input.content ?? "",
          properties: input.properties ?? {},
          stateKey,
        });

      const event = await store.recordItemEvent({
        companyId: input.companyId,
        queueId: queue.id,
        itemId: item.id,
        eventType: existing ? "item.ingested.updated" : "item.ingested.created",
        fromStateKey: existing?.stateKey ?? null,
        toStateKey: item.stateKey,
        actor,
        metadata: {
          itemKey: input.itemKey,
          idempotencyKey: input.idempotencyKey,
          createdQueue,
        },
      });

      const refreshedQueue = await store.getQueue(input.companyId, input.queueKey) ?? queue;
      return {
        queue: refreshedQueue,
        item,
        event,
        createdQueue,
        createdItem: !existing,
        upserted: Boolean(existing),
      };
    },

    async updateItem(params: Record<string, unknown>) {
      const itemId = stringField(params.itemId);
      if (!itemId) throw new TriageError(400, "item_id_required", "itemId is required");
      return store.updateItem({
        companyId: requireCompanyId(params.companyId),
        itemId,
        itemKey: stringField(params.itemKey),
        idempotencyKey: stringField(params.idempotencyKey),
        title: stringField(params.title),
        contentFormat: params.contentFormat === undefined ? undefined : sanitizeContentFormat(params.contentFormat),
        content: typeof params.content === "string" ? params.content : undefined,
        properties: params.properties === undefined ? undefined : objectField(params.properties),
        stateKey: stringField(params.stateKey),
        status: params.status === "archived" || params.status === "active" ? params.status : undefined,
      });
    },

    async updateItemContent(params: Record<string, unknown>, actor: TriageActor = {}) {
      const companyId = requireCompanyId(params.companyId);
      const itemId = ensureString(params.itemId, "item_id_required", "itemId is required");
      const item = await store.getItem(companyId, itemId);
      if (!item) throw new TriageError(404, "item_not_found", "Item not found");
      const expectedRevision = numberField(params.expectedRevision);
      if (expectedRevision !== null && expectedRevision !== item.revision) {
        throw new TriageError(409, "item_revision_conflict", "Item revision has changed", {
          expectedRevision,
          currentRevision: item.revision,
        });
      }
      const next = await store.updateItem({
        companyId,
        itemId,
        title: stringField(params.title),
        contentFormat: params.contentFormat === undefined ? undefined : sanitizeContentFormat(params.contentFormat),
        content: typeof params.content === "string" ? params.content : undefined,
        properties: params.properties === undefined ? undefined : objectField(params.properties),
      });
      const event = await store.recordItemEvent({
        companyId,
        queueId: next.queueId,
        itemId,
        eventType: "item.content.updated",
        fromStateKey: item.stateKey,
        toStateKey: next.stateKey,
        actor,
        metadata: {
          previousRevision: item.revision,
          nextRevision: next.revision,
        },
      });
      return { item: next, event };
    },

    async createGuidanceProposal(params: Record<string, unknown>, actor: TriageActor = {}) {
      const companyId = requireCompanyId(params.companyId);
      const itemId = stringField(params.itemId);
      const queueKey = stringField(params.queueKey);
      let queue: TriageQueue;
      let item: TriageItem | null = null;
      if (itemId) {
        const resolved = await requireItemWithQueue(store, companyId, itemId);
        queue = resolved.queue;
        item = resolved.item;
      } else if (queueKey) {
        const found = await store.getQueue(companyId, normalizeQueueKey(queueKey));
        if (!found) throw new TriageError(404, "queue_not_found", "Queue not found");
        queue = found;
        await store.ensureQueueDefaults(queue);
      } else {
        throw new TriageError(400, "queue_or_item_required", "queueKey or itemId is required");
      }

      const path = normalizeGuidancePath(params.path);
      const targetDoc = await store.getGuidanceDocByPath(companyId, queue.id, path);
      const suggestedChange = stringField(params.suggestedChange);
      const explicitContent = typeof params.proposedContent === "string" ? params.proposedContent : null;
      if (!explicitContent && !suggestedChange) {
        throw new TriageError(
          400,
          "guidance_proposal_content_required",
          "proposedContent or suggestedChange is required",
        );
      }
      const proposedContent = explicitContent ?? appendGuidanceSuggestion(targetDoc?.content ?? "", suggestedChange!);
      const proposal = await store.createGuidanceProposal({
        companyId,
        queueId: queue.id,
        itemId: item?.id ?? null,
        targetDocId: targetDoc?.id ?? null,
        proposedContent,
        rationale: stringField(params.rationale),
        metadata: {
          path,
          generatedBy: actor.actorType ?? "unknown",
          suggestedChange,
          itemRevision: item?.revision ?? null,
          ...(params.metadata === undefined ? {} : objectField(params.metadata)),
        },
      });
      await store.recordItemEvent({
        companyId,
        queueId: queue.id,
        itemId: item?.id ?? null,
        eventType: "guidance.proposal.created",
        actor,
        metadata: { proposalId: proposal.id, path },
      });
      return { proposal, queue, item, targetDoc };
    },

    async reviseGuidanceProposal(params: Record<string, unknown>, actor: TriageActor = {}) {
      const companyId = requireCompanyId(params.companyId);
      const proposalId = ensureString(params.proposalId, "guidance_proposal_id_required", "proposalId is required");
      const existing = await store.getGuidanceProposal(companyId, proposalId);
      if (!existing) throw new TriageError(404, "guidance_proposal_not_found", "Guidance proposal not found");
      if (existing.status === "accepted" || existing.status === "rejected") {
        throw new TriageError(409, "guidance_proposal_closed", "Closed guidance proposals cannot be revised");
      }
      const proposedContent = typeof params.proposedContent === "string" ? params.proposedContent : null;
      if (!proposedContent) {
        throw new TriageError(400, "guidance_proposal_content_required", "proposedContent is required");
      }
      const proposal = await store.updateGuidanceProposal({
        companyId,
        proposalId,
        status: "revised",
        proposedContent,
        rationale: params.rationale === undefined ? existing.rationale : stringField(params.rationale),
        metadata: {
          ...existing.metadata,
          revisedBy: actor.actorType ?? "unknown",
          revisedAt: nowIso(),
        },
      });
      await store.recordItemEvent({
        companyId,
        queueId: proposal.queueId,
        itemId: proposal.itemId,
        eventType: "guidance.proposal.revised",
        actor,
        metadata: { proposalId },
      });
      return proposal;
    },

    async rejectGuidanceProposal(params: Record<string, unknown>, actor: TriageActor = {}) {
      const companyId = requireCompanyId(params.companyId);
      const proposalId = ensureString(params.proposalId, "guidance_proposal_id_required", "proposalId is required");
      const existing = await store.getGuidanceProposal(companyId, proposalId);
      if (!existing) throw new TriageError(404, "guidance_proposal_not_found", "Guidance proposal not found");
      if (existing.status === "accepted") {
        throw new TriageError(409, "guidance_proposal_already_accepted", "Accepted guidance proposals cannot be rejected");
      }
      const proposal = await store.updateGuidanceProposal({
        companyId,
        proposalId,
        status: "rejected",
        metadata: {
          ...existing.metadata,
          rejectionReason: stringField(params.reason),
          rejectedBy: actor.actorType ?? "unknown",
          rejectedAt: nowIso(),
        },
      });
      await store.recordItemEvent({
        companyId,
        queueId: proposal.queueId,
        itemId: proposal.itemId,
        eventType: "guidance.proposal.rejected",
        actor,
        metadata: { proposalId },
      });
      return proposal;
    },

    async acceptGuidanceProposal(params: Record<string, unknown>, actor: TriageActor = {}) {
      const companyId = requireCompanyId(params.companyId);
      const proposalId = ensureString(params.proposalId, "guidance_proposal_id_required", "proposalId is required");
      const existing = await store.getGuidanceProposal(companyId, proposalId);
      if (!existing) throw new TriageError(404, "guidance_proposal_not_found", "Guidance proposal not found");
      if (existing.status === "accepted") {
        throw new TriageError(409, "guidance_proposal_already_accepted", "Guidance proposal is already accepted");
      }
      if (existing.status === "rejected") {
        throw new TriageError(409, "guidance_proposal_rejected", "Rejected guidance proposals cannot be accepted");
      }
      const path = normalizeGuidancePath(existing.metadata.path);
      const result = await store.upsertGuidanceRevision({
        companyId,
        queueId: existing.queueId,
        path,
        title: path === "guidance.md" ? "Guidance" : path,
        content: existing.proposedContent,
        summary: stringField(params.summary) ?? existing.rationale ?? "Accepted guidance proposal",
        actor,
        metadata: { proposalId },
      });
      const proposal = await store.updateGuidanceProposal({
        companyId,
        proposalId,
        status: "accepted",
        metadata: {
          ...existing.metadata,
          acceptedRevisionId: result.revision.id,
          acceptedBy: actor.actorType ?? "unknown",
          acceptedAt: nowIso(),
        },
      });
      await store.recordItemEvent({
        companyId,
        queueId: proposal.queueId,
        itemId: proposal.itemId,
        eventType: "guidance.proposal.accepted",
        actor,
        metadata: { proposalId, revisionId: result.revision.id, path },
      });
      return { proposal, doc: result.doc, revision: result.revision };
    },

    async manualEditGuidance(params: Record<string, unknown>, actor: TriageActor = {}) {
      const companyId = requireCompanyId(params.companyId);
      const queue = await this.getQueue(params);
      const path = normalizeGuidancePath(params.path);
      const content = typeof params.content === "string" ? params.content : null;
      if (content === null) throw new TriageError(400, "guidance_content_required", "content is required");
      const result = await store.upsertGuidanceRevision({
        companyId,
        queueId: queue.id,
        path,
        title: stringField(params.title) ?? (path === "guidance.md" ? "Guidance" : path),
        content,
        summary: stringField(params.summary) ?? "Manual guidance edit",
        actor,
        metadata: {
          editType: "manual",
          ...(params.metadata === undefined ? {} : objectField(params.metadata)),
        },
      });
      await store.recordItemEvent({
        companyId,
        queueId: queue.id,
        itemId: null,
        eventType: "guidance.manual_edit.applied",
        actor,
        metadata: { docId: result.doc.id, revisionId: result.revision.id, path },
      });
      return result;
    },

    async archiveItem(params: Record<string, unknown>) {
      const itemId = stringField(params.itemId);
      if (!itemId) throw new TriageError(400, "item_id_required", "itemId is required");
      return store.archiveItem(requireCompanyId(params.companyId), itemId);
    },
  };
}

export function parseIngestInput(params: Record<string, unknown>): IngestItemInput {
  return {
    companyId: requireCompanyId(params.companyId),
    queueKey: normalizeQueueKey(params.queueKey),
    title: stringField(params.title),
    contentFormat: params.contentFormat === undefined ? "markdown" : sanitizeContentFormat(params.contentFormat),
    content: typeof params.content === "string" ? params.content : "",
    properties: objectField(params.properties),
    itemKey: stringField(params.itemKey),
    idempotencyKey: stringField(params.idempotencyKey),
    requireExistingQueue: params.requireExistingQueue === true,
    initialStateKey: stringField(params.initialStateKey),
  };
}

function templateHas(template: Record<string, string>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(template, key);
}

function templatePathValue(root: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[part];
  }, root);
}

function stringifyTemplateValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
}

function renderTemplate(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([A-Za-z0-9_.:-]+)\s*\}\}/g, (_match, path: string) =>
    stringifyTemplateValue(templatePathValue(context, path)));
}

function actionTemplateContext(input: {
  queue: TriageQueue;
  item: TriageItem;
  actionKey: string;
  fromStateKey: string;
  toStateKey: string;
}): Record<string, unknown> {
  return {
    queue: input.queue,
    item: {
      ...input.item,
      propertiesJson: JSON.stringify(input.item.properties, null, 2),
    },
    transition: {
      actionKey: input.actionKey,
      fromStateKey: input.fromStateKey,
      toStateKey: input.toStateKey,
    },
  };
}

function resolveTemplate(template: Record<string, string>, context: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(Object.entries(template).map(([key, value]) => [key, renderTemplate(value, context)]));
}

function resolvedPriority(value: string | undefined): Issue["priority"] | undefined {
  if (value === undefined) return undefined;
  const priority = value.trim();
  if (!ISSUE_PRIORITIES.has(priority as Issue["priority"])) {
    throw new TriageError(422, "invalid_issue_template_priority", "Resolved issue priority is invalid");
  }
  return priority as Issue["priority"];
}

function resolvedStatus(value: string | undefined): Issue["status"] | undefined {
  if (value === undefined) return undefined;
  const status = value.trim();
  if (!ISSUE_STATUSES.has(status as Issue["status"])) {
    throw new TriageError(422, "invalid_issue_template_status", "Resolved issue status is invalid");
  }
  return status as Issue["status"];
}

function actorForIssueMutation(actor: TriageActor): { actorAgentId?: string | null; actorRunId?: string | null } {
  return {
    actorAgentId: actor.actorType === "agent" ? actor.actorId ?? null : null,
    actorRunId: actor.actorRunId ?? null,
  };
}

async function runIssueTransitionAction(input: {
  ctx: Pick<PluginContext, "issues" | "manifest">;
  queue: TriageQueue;
  item: TriageItem;
  action: TriageTransitionAction;
  fromStateKey: string;
  toStateKey: string;
  linkedWorkIssueId: string | null;
  actor: TriageActor;
}): Promise<TriageTransitionActionResult> {
  const context = actionTemplateContext({
    queue: input.queue,
    item: input.item,
    actionKey: input.action.actionKey,
    fromStateKey: input.fromStateKey,
    toStateKey: input.toStateKey,
  });
  const resolved = resolveTemplate(input.action.action.template, context);
  const existingIssue = input.linkedWorkIssueId
    ? await input.ctx.issues.get(input.linkedWorkIssueId, input.item.companyId)
    : null;

  if (input.linkedWorkIssueId && !existingIssue) {
    throw new TriageError(403, "linked_issue_cross_company_denied", "Linked work issue is not accessible in this company");
  }

  if (input.action.action.mode === "create_if_missing" && existingIssue) {
    return {
      actionKey: input.action.actionKey,
      actionType: "create_or_update_issue",
      mode: input.action.action.mode,
      result: "skipped_existing",
      issueId: existingIssue.id,
      commentCreated: false,
    };
  }

  if (input.action.action.mode === "update_existing" && !existingIssue) {
    throw new TriageError(409, "linked_issue_required", "update_existing requires a linked work issue");
  }

  const mutationActor = actorForIssueMutation(input.actor);
  const comment = templateHas(input.action.action.template, "comment") ? resolved.comment.trim() : "";
  let issue = existingIssue;
  let result: TriageTransitionActionResult["result"] = "updated";

  if (!issue) {
    const title = resolved.title.trim();
    if (!title) {
      throw new TriageError(422, "invalid_issue_template_title", "Resolved issue title cannot be empty");
    }
    issue = await input.ctx.issues.create({
      companyId: input.item.companyId,
      projectId: resolved.projectId?.trim() || undefined,
      title,
      description: templateHas(input.action.action.template, "description") ? resolved.description : undefined,
      status: resolvedStatus(templateHas(input.action.action.template, "status") ? resolved.status : undefined),
      priority: resolvedPriority(templateHas(input.action.action.template, "priority") ? resolved.priority : undefined),
      assigneeAgentId: (resolved.assigneeAgentId ?? resolved.assignee)?.trim() || undefined,
      assigneeUserId: resolved.assigneeUserId?.trim() || undefined,
      originKind: `plugin:${input.ctx.manifest.id}:transition-action`,
      originId: input.item.id,
      originRunId: input.actor.actorRunId ?? null,
      actor: mutationActor,
    });
    result = "created";
  } else {
    const patch: Partial<Pick<
      Issue,
      "title" | "description" | "status" | "priority" | "projectId" | "assigneeAgentId" | "assigneeUserId"
    >> = {};
    if (templateHas(input.action.action.template, "title")) {
      const title = resolved.title.trim();
      if (!title) throw new TriageError(422, "invalid_issue_template_title", "Resolved issue title cannot be empty");
      patch.title = title;
    }
    if (templateHas(input.action.action.template, "description")) patch.description = resolved.description;
    if (templateHas(input.action.action.template, "status")) patch.status = resolvedStatus(resolved.status);
    if (templateHas(input.action.action.template, "priority")) patch.priority = resolvedPriority(resolved.priority);
    if (templateHas(input.action.action.template, "projectId")) patch.projectId = resolved.projectId.trim() || null;
    if (templateHas(input.action.action.template, "assignee") || templateHas(input.action.action.template, "assigneeAgentId")) {
      patch.assigneeAgentId = (resolved.assigneeAgentId ?? resolved.assignee).trim() || null;
    }
    if (templateHas(input.action.action.template, "assigneeUserId")) {
      patch.assigneeUserId = resolved.assigneeUserId.trim() || null;
    }
    if (Object.keys(patch).length > 0) {
      issue = await input.ctx.issues.update(issue.id, patch, input.item.companyId, mutationActor);
    }
  }

  let commentCreated = false;
  if (comment) {
    await input.ctx.issues.createComment(issue.id, comment, input.item.companyId, {
      authorAgentId: mutationActor.actorAgentId ?? undefined,
    });
    commentCreated = true;
  }

  return {
    actionKey: input.action.actionKey,
    actionType: "create_or_update_issue",
    mode: input.action.action.mode,
    result,
    issueId: issue.id,
    commentCreated,
  };
}

export function formatTriageError(error: unknown): { status: number; body: { error: { code: string; message: string } } } {
  if (error instanceof TriageError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message,
        },
      },
    };
  }
  return {
    status: 500,
    body: {
      error: {
        code: "triage_internal_error",
        message: error instanceof Error ? error.message : String(error),
      },
    },
  };
}
