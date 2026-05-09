import { describe, it, expect, vi } from "vitest";
import { startEventWatch } from "../../src/orchestrator/event-watch.js";

function bodyFromEvents(
  events: Array<{ type: string; object: Record<string, unknown> }>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      for (const e of events) {
        controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      }
      controller.close();
    },
  });
}

describe("startEventWatch", () => {
  it("forwards Warning events with [k8s] prefix and ignores Normal", async () => {
    const client = {
      requestStream: vi.fn(
        async () =>
          new Response(
            bodyFromEvents([
              {
                type: "MODIFIED",
                object: {
                  metadata: { resourceVersion: "1" },
                  type: "Warning",
                  reason: "ImagePullBackOff",
                  message: "pull failed",
                },
              },
              {
                type: "MODIFIED",
                object: {
                  metadata: { resourceVersion: "2" },
                  type: "Normal",
                  reason: "Created",
                  message: "created pod",
                },
              },
            ]),
          ),
      ),
    } as unknown as Parameters<typeof startEventWatch>[0]["client"];

    const collected: string[] = [];
    const handle = startEventWatch({
      client,
      namespace: "ns",
      jobName: "job-x",
      onLog: async (_s, c) => {
        collected.push(c);
      },
    });
    await new Promise((r) => setTimeout(r, 200));
    handle.abort();
    await handle.done;
    expect(collected).toEqual(["[k8s] ImagePullBackOff: pull failed"]);
  });
});
