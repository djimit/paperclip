export function normalizeCursorStreamLine(rawLine: string): {
  stream: "stdout" | "stderr" | null;
  line: string;
} {
  const trimmed = rawLine.trim();
  if (!trimmed) return { stream: null, line: "" };

  const lower = trimmed.toLowerCase();
  const stream = lower.startsWith("stderr") ? "stderr" : lower.startsWith("stdout") ? "stdout" : null;
  if (!stream) return { stream: null, line: trimmed };
  let line = trimmed.slice(stream.length).trimStart();
  if (line.startsWith(":") || line.startsWith("=")) line = line.slice(1).trimStart();
  if (!line.startsWith("[") && !line.startsWith("{")) return { stream: null, line: trimmed };
  return { stream, line };
}
