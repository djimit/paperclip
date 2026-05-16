import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";
import { workspaceDiffQuerySchema } from "./contracts.js";
import { workspaceDiffService } from "./workspace-diff.js";

const PLUGIN_NAME = "workspace-diff";

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

const plugin = definePlugin({
  async setup(ctx) {
    ctx.logger.info(`${PLUGIN_NAME} plugin setup`);
    const workspaceDiff = workspaceDiffService();

    ctx.data.register("workspace-diff", async (params: Record<string, unknown>) => {
      const workspaceId = readString(params.workspaceId);
      const companyId = readString(params.companyId);
      if (!workspaceId || !companyId) {
        throw new Error("workspaceId and companyId are required");
      }

      if (params.entityType === "project_workspace") {
        const projectId = readString(params.projectId);
        if (!projectId) {
          throw new Error("projectId is required for project workspace diffs");
        }
        const workspaces = await ctx.projects.listWorkspaces(projectId, companyId);
        const workspace = workspaces.find((candidate) => candidate.id === workspaceId);
        if (!workspace) {
          throw new Error("Workspace not found");
        }
        return workspaceDiff.getDiff({
          id: workspace.id,
          companyId,
          cwd: workspace.path,
          baseRef: workspace.defaultRef ?? workspace.repoRef ?? null,
        }, workspaceDiffQuerySchema.parse(params));
      }

      const workspace = await ctx.executionWorkspaces.get(workspaceId, companyId);
      if (!workspace) {
        throw new Error("Workspace not found");
      }
      return workspaceDiff.getDiff(workspace, workspaceDiffQuerySchema.parse(params));
    });
  },

  async onHealth() {
    return { status: "ok", message: `${PLUGIN_NAME} ready` };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
