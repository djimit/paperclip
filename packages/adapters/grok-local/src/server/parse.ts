import { asString, parseJson, parseObject } from "@paperclipai/adapter-utils/server-utils";
import { applyTurnBoundary, createTurnBoundaryState } from "../shared/turn-boundary.js";

export interface ParsedGrokJsonl {
  sessionId: string | null;
  summary: string;
  thought: string;
  errorMessage: string | null;
  stopReason: string | null;
  requestId: string | null;
}

function errorText(value: unknown): string {
  if (typeof value === "string") return value;
  const rec = parseObject(value);
  const message =
    asString(rec.message, "").trim() ||
    asString(rec.error, "").trim() ||
    asString(rec.detail, "").trim() ||
    asString(rec.code, "").trim();
  if (message) return message;
  try {
    return JSON.stringify(rec);
  } catch {
    return "";
  }
}

export function parseGrokJsonl(stdout: string): ParsedGrokJsonl {
  let sessionId: string | null = null;
  let stopReason: string | null = null;
  let requestId: string | null = null;
  let errorMessage: string | null = null;
  const thoughtParts: string[] = [];
  const textParts: string[] = [];
  const thoughtBoundary = createTurnBoundaryState();

  for (const rawLine of stdout.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const event = parseJson(line);
    if (!event) continue;

    const type = asString(event.type, "").trim();
    if (type === "thought") {
      const text = asString(event.data, "");
      if (text) thoughtParts.push(applyTurnBoundary(thoughtBoundary, text));
      continue;
    }

    if (type === "text") {
      const text = asString(event.data, "");
      if (text) textParts.push(text);
      continue;
    }

    if (type === "end") {
      sessionId = asString(event.sessionId, "").trim() || sessionId;
      stopReason = asString(event.stopReason, "").trim() || stopReason;
      requestId = asString(event.requestId, "").trim() || requestId;
      continue;
    }

    if (type === "error") {
      const text = errorText(event.error ?? event.message ?? event.detail ?? event.data).trim();
      if (text) errorMessage = text;
    }
  }

  return {
    sessionId,
    summary: textParts.join("").trim(),
    thought: thoughtParts.join("").trim(),
    errorMessage,
    stopReason,
    requestId,
  };
}

export function isGrokUnknownSessionError(stdout: string, stderr: string): boolean {
  const lines = `${stdout}\n${stderr}`
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase().split(/\s+/).join(" "))
    .filter(Boolean);

  return lines.some((line) =>
    line.includes("unknown session")
    || line.includes("invalid session")
    || ["session", "resume"].some((term) => {
      const start = line.indexOf(term);
      return start >= 0 && line.indexOf("not found", start + term.length) >= 0;
    }));
}
