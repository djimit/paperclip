export function normalizeLeaseIdPart(input: string): string {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-");
  const start = normalized.startsWith("-") ? 1 : 0;
  const end = normalized.endsWith("-") ? -1 : undefined;
  return normalized.slice(start, end);
}

export function buildLeaseSandboxId(input: {
  environmentId: string;
  runId: string;
  reuseLease: boolean;
  normalizeId: boolean;
  randomId?: string;
}): string {
  const base = input.reuseLease
    ? `pc-env-${input.environmentId}`
    : `pc-${input.runId}-${input.randomId ?? crypto.randomUUID().slice(0, 8)}`;
  return input.normalizeId ? normalizeLeaseIdPart(base) : base;
}

export function buildSentinelPath(remoteCwd: string): string {
  let end = remoteCwd.length;
  while (end > 0 && remoteCwd[end - 1] === "/") end -= 1;
  return `${remoteCwd.slice(0, end)}/.paperclip-lease.json`;
}

export function isTimeoutError(error: unknown): boolean {
  const name = (error as { name?: string } | null)?.name ?? "";
  const message = error instanceof Error ? error.message : String(error);
  return /timeout/i.test(name) || /timed out|timeout/i.test(message);
}

// Single-quote `value` for safe inclusion in a `sh -c` script. Single
// quotes inside the value are escaped via the standard `'"'"'` dance.
// Used by both `routes.ts` and `exec.ts` — keep one copy here so updates
// (e.g. handling additional shell special characters) stay in sync.
export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}
