// Canonical default workflow for the v1 triage queue: Draft → Approved /
// Rejected → Done.
//
// This module is intentionally dependency-free (no React, no Node built-ins,
// no SDK imports) so it can be imported by:
//   - the worker (`src/triage.ts` seed helpers and runtime guards)
//   - the UI (`src/ui/app.tsx` rendering of the state pill + TransitionBar)
//   - tests (`tests/plugin.spec.ts` regression checks)
//
// PAP-9894 surfaced as a production bug because the UI keyed on "new" while
// the backend defaulted to "draft", so freshly-ingested items rendered the
// raw stateKey with no transition buttons. Keep the column default in
// `migrations/001_triage_core.sql` (currently `'draft'`) aligned with
// `DEFAULT_TRIAGE_DEFAULT_STATE_KEY` below.

export type TriageQueueStateVisibility = "active" | "archived";

export interface TriageQueueStateDefault {
  stateKey: string;
  displayName: string;
  isTerminal: boolean;
  visibility: TriageQueueStateVisibility;
  sortOrder: number;
}

export interface TriageQueueTransitionDefault {
  fromStateKey: string;
  toStateKey: string;
  label: string;
}

export const DEFAULT_TRIAGE_DEFAULT_STATE_KEY = "draft" as const;

export const DEFAULT_TRIAGE_QUEUE_STATES: ReadonlyArray<TriageQueueStateDefault> = [
  { stateKey: "draft", displayName: "Draft", isTerminal: false, visibility: "active", sortOrder: 10 },
  { stateKey: "approved", displayName: "Approved", isTerminal: false, visibility: "active", sortOrder: 20 },
  { stateKey: "rejected", displayName: "Rejected", isTerminal: false, visibility: "active", sortOrder: 30 },
  { stateKey: "done", displayName: "Done", isTerminal: true, visibility: "archived", sortOrder: 40 },
];

export const DEFAULT_TRIAGE_QUEUE_TRANSITIONS: ReadonlyArray<TriageQueueTransitionDefault> = [
  { fromStateKey: "draft", toStateKey: "approved", label: "Approve" },
  { fromStateKey: "draft", toStateKey: "rejected", label: "Reject" },
  { fromStateKey: "approved", toStateKey: "done", label: "Mark Done" },
  { fromStateKey: "rejected", toStateKey: "done", label: "Mark Done" },
];
