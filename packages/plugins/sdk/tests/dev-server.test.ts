import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { startPluginDevServer } from "../src/dev-server.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("plugin dev server", () => {
  it("serves UI files without following symlinks outside the UI directory", async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), "paperclip-plugin-dev-server-"));
    const outsideDir = await mkdtemp(path.join(tmpdir(), "paperclip-plugin-dev-server-outside-"));
    tempDirs.push(rootDir, outsideDir);
    await mkdir(path.join(rootDir, "dist", "ui"), { recursive: true });
    await writeFile(path.join(rootDir, "dist", "ui", "index.js"), "export const safe = true;\n");
    await writeFile(path.join(outsideDir, "secret.js"), "outside\n");
    await symlink(path.join(outsideDir, "secret.js"), path.join(rootDir, "dist", "ui", "secret.js"));

    const server = await startPluginDevServer({ rootDir, port: 0 });
    try {
      await expect(fetch(`${server.url}/index.js`).then((response) => response.text()))
        .resolves.toContain("safe = true");
      await expect(fetch(`${server.url}/secret.js`).then((response) => response.status))
        .resolves.toBe(404);
    } finally {
      await server.close();
    }
  });
});
