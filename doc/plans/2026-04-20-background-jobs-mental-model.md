# Background Jobs Mental Model

## Goal

Define how Paperclip should think about "jobs that run" without introducing a second orchestration system beside issues, routines, and heartbeat runs.

The immediate design target is memory maintenance and similar background work that must be:

- framework-owned
- auditable
- deployable outside a single local machine
- compatible with plugin-provided behavior

## Recommendation In One Sentence

Paperclip should treat background automation as a small taxonomy of existing control-plane primitives, not as one new generic queue abstraction: use agent timer heartbeats to wake agents, routines to create recurring issue work, plugin or system jobs for deterministic host-side maintenance, and explicit domain job tables when a subsystem like memory needs auditable async work that is not itself an issue.

## Current Reality In The Repo

Paperclip already has four adjacent mechanisms:

1. **Agent timer heartbeats**
   - Defined in agent adapter config.
   - Purpose: wake an agent on a schedule.
   - Output: `heartbeat_runs`.
   - This is a wake policy, not a business-work model.

2. **Routines**
   - Company-scoped and project/goal/issue-aware.
   - Purpose: recurring automation that should create or continue issue work.
   - Output: `routine_runs`, linked issues, then heartbeat runs.
   - This is the auditable recurring-task path.

3. **Plugin scheduled jobs**
   - Plugin-owned host-side handlers scheduled by the host.
   - Purpose: deterministic plugin maintenance, sync, cleanup, polling.
   - Output: `plugin_job_runs`.
   - This is infrastructure automation, not issue orchestration.

4. **Server-owned maintenance loops**
   - Examples: heartbeat recovery, routine ticking, database backups.
   - Purpose: keep the Paperclip control plane healthy.
   - Output today is mostly logs plus subsystem-specific records.
   - This is framework maintenance, not user-facing work management.

The problem is not that Paperclip has no job model. The problem is that these mechanisms need an explicit boundary so new systems like memory do not accidentally invent a fifth orchestration surface.

## Core Product Decision

Paperclip should not add a generic "jobs engine" that tries to flatten all background work into one abstraction.

Why:

- V1 already explicitly allows a lightweight in-process scheduler/worker and does not require queue infrastructure.
- Paperclip's differentiator is company-scoped orchestration, not general cron/queue infrastructure.
- A generic Bull or Redis queue layer would duplicate ownership with routines, issues, heartbeat runs, and plugin jobs.
- The repo already has a documented bias against importing runtime-level workflow or queue abstractions into the control plane without mapping them back to Paperclip entities.

The right move is to sharpen the taxonomy and add only the missing domain-specific records where needed.

## The Taxonomy

### 1. Agent timer heartbeat

Use when the question is:

- "When should this agent wake up and look for work?"

Characteristics:

- executor is an agent adapter
- unit of execution is a `heartbeat_run`
- schedule belongs to the agent runtime config
- may or may not result in issue activity

Do not use this as the default model for deterministic maintenance like compaction, syncing, or shell scripts.

### 2. Routine

Use when the question is:

- "What recurring work should become an issue in the company?"

Characteristics:

- company-scoped
- goal/project/parent-issue aware
- human-visible and auditable as work
- creates or coalesces into issue execution
- hands off to the existing issue and heartbeat execution path

Examples:

- weekly CEO review
- nightly "summarize customer feedback" task
- recurring research sweep
- scheduled agent-authored report

If the output should be a task someone can inspect, comment on, block, review, or approve, it should usually be a routine.

### 3. Plugin job or system job

Use when the question is:

- "What host-side maintenance should run without becoming an issue by default?"

Characteristics:

- deterministic host-side execution
- run by plugin worker or server-owned code
- recorded as job-run history, not as issue work
- appropriate for cleanup, polling, reconciliation, compaction, indexing, and sync

Examples:

- refresh connector metadata
- poll an external API and cache results
- compact a local index
- database backups
- plugin-specific cleanup or reconciliation

These jobs are real framework-owned automation, but they are not the same thing as company task execution.

### 4. Domain-specific async job record

Use when the question is:

- "This subsystem needs async background work with auditability, provenance, and operator visibility, but it should not become an issue every time."

This is the missing piece for memory.

Examples:

- memory extraction
- memory compaction
- dedupe / correction pipelines
- provider-managed async indexing callbacks

For these cases, the right answer is not "pretend everything is an issue" and not "hide everything inside a plugin job."

The right answer is:

- keep the scheduler/executor simple
- add subsystem-specific run records that carry Paperclip provenance
- escalate into issue work only when human-facing follow-up is required

This matches the existing memory plan's direction toward explicit extraction jobs.

## Decision Rules

When a new background process is proposed, ask these questions in order:

1. **Should this show up as company work?**
   - If yes, it should be a routine that creates issue work.
   - If no, continue.

2. **Does this require language-model reasoning or agent tool use?**
   - If yes, dispatch to an agent through the normal issue/heartbeat path.
   - If no, continue.

3. **Is this deterministic host-side maintenance owned by the framework or a plugin?**
   - If yes, use a plugin job or server-owned maintenance loop.
   - If no, continue.

4. **Does the subsystem still need first-class auditability and provenance even though it is not issue work?**
   - If yes, add a domain-specific async job record.

This keeps the control plane authoritative without forcing one storage shape onto every kind of automation.

## What This Means For Memory

Memory should use three different execution shapes depending on the operation.

### A. Pre-run hydrate

Use the heartbeat path directly.

- Trigger: before an agent heartbeat starts
- Executor: memory provider call in the run path
- Attribution: included in the run or directly metered if the provider bills separately
- Why: this is part of prompt assembly, not a background scheduler concern

### B. Post-run capture

Use one of two paths:

- synchronous capture in the run path for cheap/local providers
- asynchronous memory extraction job for heavier provider-managed or delayed work

Why:

- some providers can write immediately
- others need extraction, chunking, or delayed indexing
- Paperclip should not hide that async work if it matters for auditability or failure visibility

### C. Periodic memory "sleep cycle" / dreaming / compaction

Default to a memory-domain background job, not a system agent and not a routine.

Why:

- this is maintenance on the memory subsystem
- it may need to scan or compact provider state
- it often does not map to a user-facing issue
- forcing it through an agent adds reasoning cost and muddles ownership

If that maintenance discovers something that should become company work, it should then escalate by:

- creating an issue directly, or
- triggering a routine that creates issue work

Examples:

- "memory compaction completed" stays a memory job record
- "memory system found duplicate identities needing review" becomes an issue
- "nightly memory digest for leadership" becomes a routine because the output is work product

## Plugin Recommendation

Plugins should be able to participate in both layers, but the layers should stay distinct.

### Plugin maintenance

Plugins may continue to register scheduled jobs for host-side deterministic work.

Good fit:

- sync
- compaction
- polling
- cleanup
- provider callbacks

### Plugin-created recurring company work

If a plugin wants recurring work to enter the company task system, it should register or provision a routine, and the routine should record that provenance.

Recommended future addition:

- add routine provenance metadata such as `registeredByPluginId` or equivalent source metadata

That gives us the useful semantics behind "a plugin registered this routine" without collapsing routines into plugin jobs.

### Why not use plugin jobs alone for memory maintenance?

Because memory is company-scoped in Paperclip's product model, while plugin jobs today are plugin-owned host jobs with no first-class company targeting in their core record shape.

That makes plugin jobs a good execution mechanism, but not the full product model for company-auditable memory operations.

## System Agents

Paperclip may eventually want system agents, but they should be optional and narrow.

Good reasons to use a system agent:

- the work genuinely needs reasoning
- the output should look like authored task work
- budget attribution should land on an agent
- approvals, comments, or review are part of the loop

Bad reason to use a system agent:

- "we need to run a shell script every few hours"

That is deterministic maintenance and should stay a job, not become fake agent labor.

## Proposed Product Shape

Paperclip should describe background automation using three top-level concepts:

1. **Wakeups**
   - wake an existing executor, usually an agent

2. **Recurring work**
   - routines that create or continue issue execution

3. **Background maintenance**
   - plugin jobs, server jobs, and domain-specific async jobs

These can later share a UI grouping like "Automation" or "Background Activity" without requiring a single underlying table.

## Recommended Near-Term Follow-Up

1. Document this taxonomy in product and engineering docs where routines, plugins, and memory are discussed.
2. Add provenance metadata for routines created or managed by plugins.
3. When memory implementation begins, add explicit memory extraction job state instead of hiding async maintenance inside generic logs.
4. Keep the scheduler in-process for now; do not add Redis/Bull-style queue infrastructure unless scale or deployment evidence forces it.

## Bottom Line

Paperclip should not think of "jobs" as one new generic abstraction.

It should think of them as:

- agent wakeups when we need an agent to run
- routines when recurring automation should become issue work
- host-side jobs when the framework or a plugin needs deterministic maintenance
- domain-specific async records when a subsystem like memory needs auditable background execution without becoming a task every time

That preserves Paperclip's control-plane model, keeps deployment complexity low, and gives memory a clean place to live.
