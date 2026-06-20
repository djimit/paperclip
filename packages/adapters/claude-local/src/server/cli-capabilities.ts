import type { AdapterExecutionTarget } from "@paperclipai/adapter-utils/execution-target";
import { runAdapterExecutionTargetProcess } from "@paperclipai/adapter-utils/execution-target";
import path from "node:path";

export function claudeCommandLooksLike(command: string, expected = "claude"): boolean {
  const base = path.basename(command).toLowerCase();
  return base === expected || base === `${expected}.cmd` || base === `${expected}.exe`;
}

export async function claudeCommandSupportsEffortFlag(input: {
  runId: string;
  command: string;
  target: AdapterExecutionTarget | null | undefined;
  cwd: string;
  env: Record<string, string>;
  timeoutSec: number;
  graceSec: number;
}): Promise<boolean | null> {
  if (!claudeCommandLooksLike(input.command, "claude")) return null;

  const help = await runAdapterExecutionTargetProcess(
    input.runId,
    input.target,
    input.command,
    ["--help"],
    {
      cwd: input.cwd,
      env: input.env,
      timeoutSec: Math.max(1, Math.min(input.timeoutSec, 20)),
      graceSec: Math.max(1, Math.min(input.graceSec, 5)),
      onLog: async () => {},
    },
  );

  if (help.timedOut) return null;
  const output = `${help.stdout}\n${help.stderr}`;
  if (output.includes("--effort")) return true;
  if ((help.exitCode ?? 0) === 0) return false;
  return null;
}
