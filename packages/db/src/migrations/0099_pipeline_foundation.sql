CREATE TABLE IF NOT EXISTS "pipelines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "status" text NOT NULL DEFAULT 'active',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "pipelines_company_name_idx"
  ON "pipelines" ("company_id", "name");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "pipeline_stages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "pipeline_id" uuid NOT NULL REFERENCES "pipelines"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "kind" text NOT NULL DEFAULT 'open',
  "position" integer NOT NULL DEFAULT 0,
  "config" jsonb NOT NULL DEFAULT '{"variables":[]}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "pipeline_stage_transitions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "pipeline_id" uuid NOT NULL REFERENCES "pipelines"("id") ON DELETE CASCADE,
  "from_stage_id" uuid NOT NULL REFERENCES "pipeline_stages"("id") ON DELETE CASCADE,
  "to_stage_id" uuid NOT NULL REFERENCES "pipeline_stages"("id") ON DELETE CASCADE,
  "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pipeline_stage_transitions_pipeline_from_to_uq"
    UNIQUE ("pipeline_id","from_stage_id","to_stage_id")
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "pipeline_stages_pipeline_idx"
  ON "pipeline_stages" ("pipeline_id","position");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "pipeline_stage_transitions_pipeline_idx"
  ON "pipeline_stage_transitions" ("pipeline_id");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "pipeline_stage_transitions_from_idx"
  ON "pipeline_stage_transitions" ("from_stage_id");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "pipeline_stage_transitions_to_idx"
  ON "pipeline_stage_transitions" ("to_stage_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "pipeline_cases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "pipeline_id" uuid NOT NULL REFERENCES "pipelines"("id") ON DELETE CASCADE,
  "stage_id" uuid REFERENCES "pipeline_stages"("id") ON DELETE SET NULL,
  "parent_case_id" uuid REFERENCES "pipeline_cases"("id") ON DELETE SET NULL,
  "title" text NOT NULL,
  "status" text NOT NULL DEFAULT 'open',
  "fields" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_by_actor_id" text,
  "created_by_actor_type" text,
  "last_activity_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "pipeline_cases_pipeline_idx"
  ON "pipeline_cases" ("pipeline_id","stage_id");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "pipeline_cases_stage_idx"
  ON "pipeline_cases" ("stage_id");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "pipeline_cases_company_idx"
  ON "pipeline_cases" ("company_id");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "pipeline_cases_stage_status_idx"
  ON "pipeline_cases" ("pipeline_id","status");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "pipeline_cases_parent_idx"
  ON "pipeline_cases" ("parent_case_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "pipeline_case_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "pipeline_id" uuid NOT NULL REFERENCES "pipelines"("id") ON DELETE CASCADE,
  "case_id" uuid NOT NULL REFERENCES "pipeline_cases"("id") ON DELETE CASCADE,
  "kind" text NOT NULL,
  "summary" text,
  "payload" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "pipeline_case_events_pipeline_idx"
  ON "pipeline_case_events" ("pipeline_id","case_id");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "pipeline_case_events_case_idx"
  ON "pipeline_case_events" ("case_id");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "pipeline_case_events_kind_idx"
  ON "pipeline_case_events" ("kind");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "pipeline_guidance_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "pipeline_id" uuid NOT NULL REFERENCES "pipelines"("id") ON DELETE CASCADE,
  "key" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pipeline_guidance_documents_pipeline_key_uq" UNIQUE ("pipeline_id", "key")
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "pipeline_case_issue_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "case_id" uuid NOT NULL REFERENCES "pipeline_cases"("id") ON DELETE CASCADE,
  "issue_id" uuid NOT NULL REFERENCES "issues"("id") ON DELETE CASCADE,
  "role" text NOT NULL DEFAULT 'automation',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pipeline_case_issue_links_case_issue_uq" UNIQUE ("case_id","issue_id")
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "pipeline_case_issue_links_case_idx"
  ON "pipeline_case_issue_links" ("case_id","issue_id");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "pipeline_case_issue_links_issue_idx"
  ON "pipeline_case_issue_links" ("issue_id","case_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "pipeline_case_blockers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "case_id" uuid NOT NULL REFERENCES "pipeline_cases"("id") ON DELETE CASCADE,
  "blocked_by_case_id" uuid NOT NULL REFERENCES "pipeline_cases"("id") ON DELETE CASCADE,
  "reason" text,
  "resolved" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "resolved_at" timestamptz,
  CONSTRAINT "pipeline_case_blockers_pair_uq" UNIQUE ("case_id","blocked_by_case_id")
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "pipeline_case_blockers_case_idx"
  ON "pipeline_case_blockers" ("case_id");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "pipeline_case_blockers_blocked_by_idx"
  ON "pipeline_case_blockers" ("blocked_by_case_id");
