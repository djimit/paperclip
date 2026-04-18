ALTER TABLE "heartbeat_runs" ADD COLUMN "liveness_state" text;--> statement-breakpoint
ALTER TABLE "heartbeat_runs" ADD COLUMN "liveness_reason" text;--> statement-breakpoint
ALTER TABLE "heartbeat_runs" ADD COLUMN "continuation_attempt" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "heartbeat_runs" ADD COLUMN "last_useful_action_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "heartbeat_runs" ADD COLUMN "next_action" text;--> statement-breakpoint
CREATE INDEX "heartbeat_runs_company_liveness_idx" ON "heartbeat_runs" USING btree ("company_id","liveness_state","created_at");