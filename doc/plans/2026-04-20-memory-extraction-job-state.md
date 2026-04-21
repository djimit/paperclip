# Memory Extraction Job State

Status: proposed design
Date: 2026-04-20
Owner issue: `PAP-1702`
Related docs:

- `doc/plans/2026-04-20-background-jobs-mental-model.md`
- `doc/plans/2026-03-17-memory-service-surface-api.md`

## Goal

Define the first domain-specific async job record in Paperclip: a company-scoped memory job state model for asynchronous capture, compaction, and dreaming work that must be auditable without becoming issue work by default.

This design keeps the background-jobs taxonomy from `2026-04-20-background-jobs-mental-model.md` intact:

- no generic queue engine
- no reuse of plugin job tables as the product model
- no requirement to invent a system agent just to run deterministic maintenance

## Decision Summary

Paperclip should add a `memory_extraction_jobs` table whose rows represent **job attempts**, not recurring definitions and not a generic workflow engine.

The row is the durable audit object for async memory work that sits beside, but does not replace:

- `heartbeat_runs` for agent execution
- `routine_runs` for recurring issue work
- `plugin_job_runs` for plugin-owned host maintenance
- `cost_events` for canonical spend accounting

The row should carry enough provenance to answer:

- what memory work happened
- what company, agent, issue, and run it came from
- which memory binding handled it
- what it cost
- whether it succeeded, failed, or needs operator attention

Retries should create a **new** job row with `retryOfJobId` instead of mutating a terminal row back to `queued`.

## Why A Domain Job Record Is The Right Layer

Memory is the first concrete subsystem that needs background work with all of the following:

- company scope
- auditability
- operator visibility
- attribution back to issue and run context
- optional provider-managed asynchronous completion

That makes it a poor fit for:

- issues, because most memory capture/compaction work is not human-facing task work
- plugin jobs, because those are plugin-owned host jobs rather than company-auditable memory records
- system agents, because capture/compaction/dreaming are deterministic maintenance unless they explicitly need reasoning

## Proposed Schema

### Minimum persisted row

The minimum record should be a new `memory_extraction_jobs` table with these fields.

| Field | Purpose |
| --- | --- |
| `id` | Stable job-attempt id |
| `company_id` | Company scope boundary |
| `binding_id` | FK to the resolved memory binding |
| `binding_key` | Stable operator-facing binding identifier snapshot |
| `operation_type` | `capture | compaction | dreaming` |
| `status` | `queued | running | succeeded | failed | cancelled` |
| `source_agent_id` | Agent provenance when present |
| `source_issue_id` | Issue provenance when present |
| `source_project_id` | Project provenance when present |
| `source_goal_id` | Goal provenance when present |
| `source_heartbeat_run_id` | Run provenance when present |
| `hook_kind` | `post_run_capture`, `issue_comment_capture`, `issue_document_capture`, or null for pure maintenance jobs |
| `provider_job_id` | Provider-native async job id when one exists |
| `submitted_at` | When Paperclip enqueued the job |
| `started_at` | When a worker claimed execution |
| `finished_at` | Terminal timestamp |
| `attribution_mode` | `included_in_run | billed_directly | external_invoice | untracked` |
| `cost_cents` | Job-level billed cost summary for operator visibility |
| `result_summary` | Human-readable summary suitable for a list row |
| `error_code` | Stable failure classifier |
| `error` | Human-readable failure detail |
| `created_at` / `updated_at` | Audit timestamps |

### Supporting fields needed for safe dispatch and rerun

The following fields are not part of the problem statement's minimum list, but they make the V1 design operationally sound:

| Field | Why it exists |
| --- | --- |
| `source_kind` | Distinguish run/comment/document/manual/maintenance origins |
| `source_ref_json` | Hold comment id, document key, subject id, namespace, and other source-specific identifiers without over-normalizing the first slice |
| `retry_of_job_id` | Preserve attempt history when a job is rerun |
| `attempt_number` | Make retries visible in the list and detail surfaces |
| `dispatcher_kind` | Start with `in_process`, preserve a clean seam for later host-side workers |
| `lease_expires_at` | Lets the scheduler detect stale `running` work without adding a new status |
| `usage_json` | Store token/latency/provider usage summary without overextending `cost_events` in the first slice |
| `result_json` | Structured output such as record counts, callback payload, or escalation metadata |

### Notes on normalization

- `binding_id` should be the authoritative FK.
- `binding_key` should still be stored on the row so operators can read history even if the binding is later renamed or deleted.
- `source_ref_json` should stay lightweight. Do not snapshot full transcript bodies here.
- `result_summary` should be short and readable, for example `Captured 14 records from run residue` or `Compaction found 3 duplicate record groups`.

## Relationship To `memory_operations`

The earlier memory plan introduced `memory_operations` as the broader audit trail for all memory actions. This design does not replace that.

The cleanest end state is:

- `memory_operations` logs every memory action, synchronous or asynchronous
- `memory_extraction_jobs` tracks async job-attempt state for the subset of operations that run outside the initiating request path

For the first implementation slice, the job record should include enough provenance and usage fields to stand on its own even before a full memory operation explorer lands.

When `memory_operations` is added, `memory_extraction_jobs` should gain an optional `operation_id` FK rather than forcing operators to infer the relationship.

## Lifecycle

### States

The persisted lifecycle is intentionally small:

- `queued`
- `running`
- `succeeded`
- `failed`
- `cancelled`

`stuck` is **not** a persisted status. It is a derived operator state:

- `status = running`
- `lease_expires_at < now()`

That keeps the state machine simple while still giving the board a meaningful "this needs attention" filter.

### State transitions

1. `queued -> running`
   The in-process dispatcher claims the job transactionally, sets `started_at`, and sets `lease_expires_at`.

2. `running -> succeeded`
   The provider or worker completes successfully. Persist `finished_at`, `result_summary`, optional `result_json`, and usage/cost summary.

3. `running -> failed`
   The provider errors, a callback/poll path reports failure, or the lease expires and the recovery sweep marks the job failed with a stable `error_code`.

4. `queued -> cancelled`
   Operator or system cancellation before execution starts.

5. `running -> cancelled`
   Allowed only when the provider or host-side runner can stop safely. If cancellation is best-effort only, the row should still be marked cancelled and late provider callbacks should be ignored.

6. `failed -> rerun`
   Not an in-place state transition. Create a new `queued` row with `retry_of_job_id` pointing to the failed attempt.

### Failure and stuck handling

V1 should use conservative recovery:

- expired `running` jobs are surfaced as derived `stuck`
- the scheduler recovery sweep marks them `failed` with `error_code = "lease_expired"` or `error_code = "worker_lost"`
- operators can rerun the job from the detail view

This avoids silent duplicate compaction/capture work after a server restart.

## Run And Cost Attribution

Memory jobs should integrate with the current Paperclip run/cost model without pretending to be heartbeat runs.

### Run model

- A memory job does **not** create a `heartbeat_run`.
- If the job came from a heartbeat hook, the job stores `source_heartbeat_run_id` and links back to the originating run.
- For maintenance jobs like dreaming or compaction, `source_heartbeat_run_id` may be null while `source_agent_id` or only company scope is present.

### Cost model

`cost_events` remains the canonical spend ledger.

The job row should store a summarized view of usage and cost so the operator can inspect one row without joining multiple financial tables.

Rules:

1. If the memory work was already billed inside the originating heartbeat run, store:
   - `attribution_mode = "included_in_run"`
   - `cost_cents` as the summarized included amount if the provider reports it, otherwise `0`
   - `source_heartbeat_run_id` linking back to the run ledger

2. If the provider makes direct metered calls outside the run accounting path, store:
   - `attribution_mode = "billed_directly"`
   - summarized usage on the job row
   - one or more normal `cost_events` with the same company/agent/issue/project/goal provenance when available

3. Flat provider subscription costs stay in `finance_events`, not on job rows except as attribution metadata.

The memory job list is for operational visibility. Finance surfaces still aggregate from `cost_events` and `finance_events`.

## Dispatch Model

### V1 dispatcher

V1 should use an in-process server-owned dispatcher with the same product posture as the rest of the current scheduler work.

Recommended service split:

- `MemoryJobStore`
  - enqueue job
  - claim next queued job
  - complete/fail/cancel job
  - list/filter/get jobs

- `MemoryJobDispatcher`
  - polls for queued jobs
  - claims a job transactionally
  - resolves the memory binding/provider
  - executes the appropriate capture/compaction/dreaming handler
  - records result, usage, and failure state

- `MemoryJobRecovery`
  - sweeps expired leases
  - marks stale `running` jobs failed
  - leaves rerun as an explicit operator action in V1

### Why a lease matters in V1

Even with one in-process dispatcher, the record shape should assume that workers can disappear between `running` and terminal state.

`lease_expires_at` gives V1:

- a clean way to derive `stuck`
- deterministic startup recovery
- a seamless transition to future host-side workers that use the same claim protocol

### Seam for host-side workers later

The host-side worker version should reuse the same table and lifecycle:

- workers still claim `queued` rows
- workers still extend or complete leases
- callbacks or pollers still update the same job row

The seam is **where the claim/execute loop lives**, not a different product model.

## Which Work Enqueues Memory Jobs

### Capture

Use `memory_extraction_jobs` when post-run or post-comment capture cannot finish synchronously in the originating request path.

Examples:

- provider-managed extraction that returns a provider job id
- delayed embedding/indexing
- large comment/document capture that should not block the request

### Compaction

Use the job table for deterministic maintenance like:

- dedupe
- merge
- index rebuild
- cleanup of stale records

These are maintenance tasks, not issue work by default.

### Dreaming

Use the same table for periodic higher-level memory maintenance that still stays inside the memory subsystem:

- nightly synthesis
- relationship consolidation
- profile refresh

If the work needs real reasoning, authored output, or review, that is the point where it stops being "just a memory job" and should escalate.

## Escalation Rules

Most memory jobs should remain job records. Escalation is for human-facing follow-up, not for ordinary maintenance noise.

### Stay as a job record

Keep the result inside `memory_extraction_jobs` when:

- capture succeeded
- compaction succeeded
- dreaming succeeded
- a job failed once but the next action is simply rerun or inspect in the memory UI
- the output is operational metadata, not company work

### Create an issue directly

Create an issue when:

- a binding is misconfigured and future jobs will keep failing
- the same job class fails repeatedly and needs product/engineering intervention
- compaction or dreaming finds data quality anomalies that require review
- a rerun cannot proceed because the required source is gone or corrupted

The issue should link back to the originating memory job id and source issue/run where available.

### Trigger a routine

Use a routine only when the desired outcome is recurring company work rather than maintenance.

Examples:

- nightly leadership digest built from memory state
- recurring agent task to review suspicious memory merges
- periodic audit report that should appear as issue work

The key rule is:

- memory maintenance stays a memory job
- recurring deliverable-producing work becomes a routine

## Operator Visibility

### Minimum API surface

Add company-scoped memory job endpoints:

- `GET /api/companies/:companyId/memory/jobs`
- `GET /api/companies/:companyId/memory/jobs/:jobId`
- `POST /api/companies/:companyId/memory/jobs/:jobId/rerun`

Initial list filters should include:

- `status`
- `effectiveState=stuck`
- `bindingKey`
- `operationType`
- `agentId`
- `issueId`
- `runId`
- date range

The list response should include enough summary data for a table row:

- status / effective state
- operation type
- binding key
- source issue/run links
- started/finished timestamps
- cost summary
- result summary or error
- retry count

### Minimum board UI

The first UI does not need a full "memory dashboard". It does need an operator-visible failure surface.

Minimum board behavior:

- a memory jobs list reachable from the future memory settings/operations area
- filters for failed and stuck work
- list rows that link back to issue and run provenance
- detail view with error, usage, provider job id, and rerun action
- optional dashboard badge/count for failed or stuck jobs

### Rerun semantics

`rerun` should:

- validate the source can still be resolved or that the job is self-contained
- create a new `queued` row
- set `retry_of_job_id`
- preserve original provenance

It should not mutate the old row, clear its error, or hide prior operator history.

## Explicit Non-Goals

This design deliberately does **not** do the following:

- no generic Paperclip-wide job engine
- no Bull/Redis queue infrastructure
- no coupling memory jobs to `plugin_jobs` / `plugin_job_runs`
- no requirement for a system agent to perform deterministic memory maintenance
- no silent conversion of every memory failure into an issue
- no full provider corpus mirroring in Postgres

## Recommended Implementation Follow-Ups

The next implementation work should be split into separate child issues:

1. **Schema and contracts**
   - add `memory_extraction_jobs` schema
   - add shared types/constants/validators
   - add list/detail/rerun API contracts

2. **Dispatcher and recovery**
   - implement `MemoryJobStore`
   - implement in-process dispatcher claim/run/complete flow
   - add lease-expiry recovery and derived stuck detection

3. **First async memory path**
   - wire async post-run capture to enqueue memory jobs
   - persist provenance, result summaries, and cost attribution
   - validate rerun behavior for capture jobs

4. **Board visibility**
   - add memory jobs list/detail UI
   - expose failed/stuck filters
   - add rerun action for eligible jobs

## Bottom Line

The first memory job state should be a narrow, company-scoped, domain-specific async job record.

It should:

- feel native to Paperclip's existing run/cost/audit model
- keep deterministic memory maintenance out of the issue system by default
- preserve enough provenance for operators to debug failures
- stay simple enough that V1 can run it in-process today and move it to host-side workers later without changing the product model
