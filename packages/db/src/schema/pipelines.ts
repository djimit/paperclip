import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { PipelineStageConfig } from "@paperclipai/shared";
import { companies } from "./companies.js";
import { issues } from "./issues.js";

export const pipelines = pgTable(
  "pipelines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyNameIdx: index("pipelines_company_name_idx").on(table.companyId, table.name),
  }),
);

export const pipelineStages = pgTable(
  "pipeline_stages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pipelineId: uuid("pipeline_id").notNull().references(() => pipelines.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: text("kind").notNull().default("open"),
    position: integer("position").notNull().default(0),
    config: jsonb("config").$type<PipelineStageConfig>().notNull().default({ variables: [] }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pipelineIdx: index("pipeline_stages_pipeline_idx").on(table.pipelineId, table.position),
    pipelinePositionUq: uniqueIndex("pipeline_stages_pipeline_position_uq").on(table.pipelineId, table.position),
  }),
);

export const pipelineTransitions = pgTable(
  "pipeline_stage_transitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pipelineId: uuid("pipeline_id").notNull().references(() => pipelines.id, { onDelete: "cascade" }),
    fromStageId: uuid("from_stage_id").notNull().references(() => pipelineStages.id, { onDelete: "cascade" }),
    toStageId: uuid("to_stage_id").notNull().references(() => pipelineStages.id, { onDelete: "cascade" }),
    config: jsonb("config").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pipelineIdx: index("pipeline_stage_transitions_pipeline_idx").on(table.pipelineId),
    fromIdx: index("pipeline_stage_transitions_from_idx").on(table.fromStageId),
    toIdx: index("pipeline_stage_transitions_to_idx").on(table.toStageId),
    uniqueTransition: uniqueIndex("pipeline_stage_transitions_pipeline_from_to_uq")
      .on(table.pipelineId, table.fromStageId, table.toStageId),
  }),
);

export const pipelineCases = pgTable(
  "pipeline_cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    pipelineId: uuid("pipeline_id").notNull().references(() => pipelines.id, { onDelete: "cascade" }),
    stageId: uuid("stage_id").references((): AnyPgColumn => pipelineStages.id, { onDelete: "set null" }),
    parentCaseId: uuid("parent_case_id").references((): AnyPgColumn => pipelineCases.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    status: text("status").notNull().default("open"),
    fields: jsonb("fields").$type<Record<string, unknown>>().notNull().default({}),
    createdByActorId: text("created_by_actor_id"),
    createdByActorType: text("created_by_actor_type"),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pipelineIdx: index("pipeline_cases_pipeline_idx").on(table.pipelineId, table.stageId),
    stageIdx: index("pipeline_cases_stage_idx").on(table.stageId),
    companyIdx: index("pipeline_cases_company_idx").on(table.companyId),
    stageStatusIdx: index("pipeline_cases_stage_status_idx").on(table.pipelineId, table.status),
    parentIdx: index("pipeline_cases_parent_idx").on(table.parentCaseId),
  }),
);

export const pipelineCaseEvents = pgTable(
  "pipeline_case_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    pipelineId: uuid("pipeline_id").notNull().references(() => pipelines.id, { onDelete: "cascade" }),
    caseId: uuid("case_id").notNull().references((): AnyPgColumn => pipelineCases.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    summary: text("summary"),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pipelineIdx: index("pipeline_case_events_pipeline_idx").on(table.pipelineId, table.caseId),
    caseIdx: index("pipeline_case_events_case_idx").on(table.caseId),
    kindIdx: index("pipeline_case_events_kind_idx").on(table.kind),
  }),
);

export const pipelineGuidanceDocuments = pgTable(
  "pipeline_guidance_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pipelineId: uuid("pipeline_id").notNull().references(() => pipelines.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pipelineIdx: index("pipeline_guidance_documents_pipeline_idx").on(table.pipelineId),
    pipelineKeyUq: uniqueIndex("pipeline_guidance_documents_pipeline_key_uq").on(table.pipelineId, table.key),
  }),
);

export const pipelineCaseIssueLinks = pgTable(
  "pipeline_case_issue_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id").notNull().references(() => pipelineCases.id, { onDelete: "cascade" }),
    issueId: uuid("issue_id").notNull().references(() => issues.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("automation"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    caseIdx: index("pipeline_case_issue_links_case_idx").on(table.caseId, table.issueId),
    issueIdx: index("pipeline_case_issue_links_issue_idx").on(table.issueId, table.caseId),
    caseIssueUq: uniqueIndex("pipeline_case_issue_links_case_issue_uq").on(table.caseId, table.issueId),
  }),
);

export const pipelineCaseBlockers = pgTable(
  "pipeline_case_blockers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id").notNull().references((): AnyPgColumn => pipelineCases.id, { onDelete: "cascade" }),
    blockedByCaseId: uuid("blocked_by_case_id").notNull().references((): AnyPgColumn => pipelineCases.id, { onDelete: "cascade" }),
    reason: text("reason"),
    resolved: boolean("resolved").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => ({
    caseIdx: index("pipeline_case_blockers_case_idx").on(table.caseId),
    blockedByIdx: index("pipeline_case_blockers_blocked_by_idx").on(table.blockedByCaseId),
    casePairUq: uniqueIndex("pipeline_case_blockers_pair_uq").on(table.caseId, table.blockedByCaseId),
  }),
);
