import type { KubernetesApiClient } from "../types.js";

/**
 * Watches Kubernetes Events for a given Job (and its Pod via the same
 * involvedObject.name field selector) and surfaces Warning events as
 * `[k8s] <reason>: <message>` log lines through `onLog`. Normal events
 * are intentionally dropped — they're noisy and not actionable for users.
 */
export interface EventWatchHandle {
  abort(): void;
  done: Promise<void>;
}

export interface StartEventWatchInput {
  client: KubernetesApiClient;
  namespace: string;
  /** Filter to events whose involvedObject is the Job or its Pod. */
  jobName: string;
  onLog: (stream: "stdout" | "stderr", chunk: string) => Promise<void>;
}

interface RawWatchEvent {
  type: string;
  object: {
    metadata?: { resourceVersion?: string };
    type?: string;
    reason?: string;
    message?: string;
  };
}

export function startEventWatch(input: StartEventWatchInput): EventWatchHandle {
  const controller = new AbortController();
  let resolveDone!: () => void;
  const done = new Promise<void>((res) => {
    resolveDone = res;
  });

  const loop = async () => {
    const fieldSelector = encodeURIComponent(`involvedObject.name=${input.jobName}`);
    let resourceVersion = "0";
    while (!controller.signal.aborted) {
      try {
        const path =
          `/api/v1/namespaces/${encodeURIComponent(input.namespace)}/events` +
          `?watch=true&fieldSelector=${fieldSelector}&resourceVersion=${resourceVersion}`;
        const res = await input.client.requestStream("GET", path);
        if (!res.ok || !res.body) break;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!controller.signal.aborted) {
          const { value, done: streamDone } = await reader.read();
          if (streamDone) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const evt = JSON.parse(line) as RawWatchEvent;
              if (evt.object.metadata?.resourceVersion) {
                resourceVersion = evt.object.metadata.resourceVersion;
              }
              if (evt.object.type === "Warning") {
                await input.onLog(
                  "stdout",
                  `[k8s] ${evt.object.reason ?? "Warning"}: ${evt.object.message ?? ""}`,
                );
              }
            } catch {
              /* skip malformed line — partial JSON, recoverable */
            }
          }
        }
        if (controller.signal.aborted) break;
        await new Promise((r) => setTimeout(r, 500));
      } catch {
        if (controller.signal.aborted) break;
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    resolveDone();
  };

  loop().catch(() => {
    /* swallow; abort path always resolves done */
  });

  return {
    abort: () => controller.abort(),
    done,
  };
}
