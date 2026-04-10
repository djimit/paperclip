import { z } from "zod";
import {
  MEMORY_BINDING_TARGET_TYPES,
  MEMORY_HOOK_KINDS,
  MEMORY_OPERATION_STATUSES,
  MEMORY_OPERATION_TYPES,
  MEMORY_SOURCE_KINDS,
} from "../constants.js";

export const memoryScopeSchema = z
  .object({
    agentId: z.string().uuid().nullable().optional(),
    projectId: z.string().uuid().nullable().optional(),
    issueId: z.string().uuid().nullable().optional(),
    runId: z.string().uuid().nullable().optional(),
    subjectId: z.string().trim().max(200).nullable().optional(),
  })
  .strict();

export const memorySourceRefSchema = z
  .object({
    kind: z.enum(MEMORY_SOURCE_KINDS),
    issueId: z.string().uuid().nullable().optional(),
    commentId: z.string().uuid().nullable().optional(),
    documentKey: z.string().trim().max(64).nullable().optional(),
    runId: z.string().uuid().nullable().optional(),
    activityId: z.string().uuid().nullable().optional(),
    externalRef: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

export const memoryProviderCapabilitiesSchema = z
  .object({
    browse: z.boolean().optional().default(false),
    correction: z.boolean().optional().default(false),
    asyncIngestion: z.boolean().optional().default(false),
    providerManagedExtraction: z.boolean().optional().default(false),
  })
  .strict();

export const createMemoryBindingSchema = z
  .object({
    key: z.string().trim().min(1).max(64).regex(/^[a-z0-9][a-z0-9_-]*$/, "Binding key must be lowercase letters, numbers, _ or -"),
    name: z.string().trim().max(200).nullable().optional(),
    providerKey: z.string().trim().min(1).max(128),
    config: z.record(z.unknown()).optional().default({}),
    enabled: z.boolean().optional().default(true),
  })
  .strict();

export const updateMemoryBindingSchema = z
  .object({
    name: z.string().trim().max(200).nullable().optional(),
    config: z.record(z.unknown()).optional(),
    enabled: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one field must be updated");

export const setCompanyMemoryBindingSchema = z
  .object({
    bindingId: z.string().uuid(),
  })
  .strict();

export const setAgentMemoryBindingSchema = z
  .object({
    bindingId: z.string().uuid().nullable(),
  })
  .strict();

export const memoryQuerySchema = z
  .object({
    bindingKey: z.string().trim().min(1).max(64).optional(),
    scope: memoryScopeSchema.optional().default({}),
    query: z.string().trim().min(1).max(4000),
    topK: z.number().int().positive().max(25).optional().default(5),
    intent: z.enum(["agent_preamble", "answer", "browse"]).optional().default("answer"),
    metadataFilter: z.record(z.unknown()).optional(),
  })
  .strict();

export const memoryCaptureSchema = z
  .object({
    bindingKey: z.string().trim().min(1).max(64).optional(),
    scope: memoryScopeSchema.optional().default({}),
    source: memorySourceRefSchema,
    title: z.string().trim().max(200).nullable().optional(),
    content: z.string().trim().min(1).max(20000),
    summary: z.string().trim().max(2000).nullable().optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict();

export const memoryForgetSchema = z
  .object({
    recordIds: z.array(z.string().uuid()).min(1).max(100),
    scope: memoryScopeSchema.optional().default({}),
  })
  .strict();

export const memoryListRecordsQuerySchema = z
  .object({
    bindingId: z.string().uuid().optional(),
    agentId: z.string().uuid().optional(),
    issueId: z.string().uuid().optional(),
    runId: z.string().uuid().optional(),
    sourceKind: z.enum(MEMORY_SOURCE_KINDS).optional(),
    includeDeleted: z.coerce.boolean().optional().default(false),
    limit: z.coerce.number().int().positive().max(200).optional().default(50),
  })
  .strict();

export const memoryListOperationsQuerySchema = z
  .object({
    bindingId: z.string().uuid().optional(),
    operationType: z.enum(MEMORY_OPERATION_TYPES).optional(),
    status: z.enum(MEMORY_OPERATION_STATUSES).optional(),
    hookKind: z.enum(MEMORY_HOOK_KINDS).optional(),
    agentId: z.string().uuid().optional(),
    issueId: z.string().uuid().optional(),
    runId: z.string().uuid().optional(),
    limit: z.coerce.number().int().positive().max(200).optional().default(50),
  })
  .strict();

export const memoryListExtractionJobsQuerySchema = z
  .object({
    bindingId: z.string().uuid().optional(),
    limit: z.coerce.number().int().positive().max(200).optional().default(50),
  })
  .strict();

export const memoryBindingTargetTypeSchema = z.enum(MEMORY_BINDING_TARGET_TYPES);

export type MemoryScopeInput = z.infer<typeof memoryScopeSchema>;
export type MemorySourceRefInput = z.infer<typeof memorySourceRefSchema>;
export type CreateMemoryBinding = z.infer<typeof createMemoryBindingSchema>;
export type UpdateMemoryBinding = z.infer<typeof updateMemoryBindingSchema>;
export type SetCompanyMemoryBinding = z.infer<typeof setCompanyMemoryBindingSchema>;
export type SetAgentMemoryBinding = z.infer<typeof setAgentMemoryBindingSchema>;
export type MemoryQuery = z.infer<typeof memoryQuerySchema>;
export type MemoryCapture = z.infer<typeof memoryCaptureSchema>;
export type MemoryForget = z.infer<typeof memoryForgetSchema>;
export type MemoryListRecordsQuery = z.infer<typeof memoryListRecordsQuerySchema>;
export type MemoryListOperationsQuery = z.infer<typeof memoryListOperationsQuerySchema>;
export type MemoryListExtractionJobsQuery = z.infer<typeof memoryListExtractionJobsQuerySchema>;
