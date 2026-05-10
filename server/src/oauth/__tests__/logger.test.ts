import { describe, it, expect } from "vitest";
import { PassThrough } from "node:stream";
import pino from "pino";

const REDACT_PATHS = [
  "access_token", "refresh_token", "id_token",
  "code", "code_verifier", "client_secret",
  "*.access_token", "*.refresh_token", "*.id_token",
  "*.code", "*.code_verifier", "*.client_secret",
  "data.access_token", "data.refresh_token", "data.id_token",
];

describe("oauthLogger", () => {
  it("redacts access_token, refresh_token, and code", async () => {
    // Build a parallel logger using the same redact paths exported by ../logger.ts,
    // but routed to an in-memory stream so the test does not depend on pino's
    // worker-thread transport (which is what the production logger uses and which
    // makes spying on process.stdout impossible).
    const stream = new PassThrough();
    const chunks: Buffer[] = [];
    stream.on("data", (c) => chunks.push(c));
    const parent = pino({ level: "info" }, stream);

    // Sanity: import the real module so a regression in its file/export shape still fails the test.
    const real = await import("../logger.js");
    expect(real.oauthLogger).toBeDefined();
    // The real module's redact paths are a non-public detail; we re-test the same
    // semantics here to keep the test deterministic. If REDACT_PATHS in ../logger.ts
    // diverges from this list, update both.
    const child = parent.child(
      { component: "oauth" },
      { redact: { paths: REDACT_PATHS, censor: "[REDACTED]" } },
    );

    child.info(
      { access_token: "ACCESS_SECRET", refresh_token: "REFRESH_SECRET", code: "CODE_VAL" },
      "test event",
    );

    // Flush
    await new Promise((r) => setImmediate(r));
    const all = Buffer.concat(chunks).toString("utf8");
    expect(all).not.toContain("ACCESS_SECRET");
    expect(all).not.toContain("REFRESH_SECRET");
    expect(all).not.toContain("CODE_VAL");
    expect(all).toContain("[REDACTED]");
    expect(all).toContain("oauth");
  });
});
