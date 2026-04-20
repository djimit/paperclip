import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { memoryApi } from "../api/memory";
import { MemoryOverrideCard } from "./MemoryOverrideCard";
import { useToast } from "../context/ToastContext";
import { queryKeys } from "../lib/queryKeys";
import { Button } from "@/components/ui/button";

function companyPath(companyPrefix: string | null | undefined, path: string) {
  if (!companyPrefix) return path;
  return `/${companyPrefix}${path}`;
}

export function ProjectMemorySettings({
  companyId,
  projectId,
  companyPrefix,
}: {
  companyId: string;
  projectId: string;
  companyPrefix?: string | null;
}) {
  const { pushToast } = useToast();
  const queryClient = useQueryClient();

  const bindingsQuery = useQuery({
    queryKey: queryKeys.memory.bindings(companyId),
    queryFn: () => memoryApi.listBindings(companyId),
  });

  const resolvedBindingQuery = useQuery({
    queryKey: queryKeys.memory.projectBinding(projectId),
    queryFn: () => memoryApi.getProjectBinding(projectId),
  });

  const targetsQuery = useQuery({
    queryKey: queryKeys.memory.targets(companyId),
    queryFn: () => memoryApi.listTargets(companyId),
  });

  const saveOverride = useMutation({
    mutationFn: (bindingId: string | null) => memoryApi.setProjectBinding(projectId, bindingId),
    onSuccess: async (_target, bindingId) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.memory.all });
      pushToast({
        title: "Project memory binding updated",
        body: bindingId === null
          ? "This project now inherits the company default binding."
          : "The project override is active for subsequent memory operations.",
        tone: "success",
      });
    },
    onError: (error) => {
      pushToast({
        title: "Failed to update project memory binding",
        body: error instanceof Error ? error.message : "Unknown error",
        tone: "error",
      });
    },
  });

  const loading = bindingsQuery.isLoading || resolvedBindingQuery.isLoading || targetsQuery.isLoading;
  const error = bindingsQuery.error ?? resolvedBindingQuery.error ?? targetsQuery.error ?? null;
  const agentOverrideCount = (targetsQuery.data ?? []).filter((target) => target.targetType === "agent").length;
  const companySettingsHref = companyPath(companyPrefix, "/company/settings#memory");
  const projectMemoriesHref = companyPath(companyPrefix, `/memories?projectId=${encodeURIComponent(projectId)}`);

  return (
    <div className="max-w-3xl space-y-4">
      <MemoryOverrideCard
        targetType="project"
        resolvedBinding={resolvedBindingQuery.data}
        bindings={bindingsQuery.data ?? []}
        source={resolvedBindingQuery.data?.source}
        loading={loading}
        error={error}
        saving={saveOverride.isPending}
        saveError={saveOverride.error instanceof Error ? saveOverride.error : null}
        agentOverrideCount={agentOverrideCount}
        companySettingsHref={companySettingsHref}
        onRetry={() => {
          void bindingsQuery.refetch();
          void resolvedBindingQuery.refetch();
          void targetsQuery.refetch();
        }}
        onSave={(bindingId) => saveOverride.mutate(bindingId)}
      />
      <Button asChild variant="link" className="h-auto px-0">
        <a href={projectMemoriesHref}>See memories for this project</a>
      </Button>
    </div>
  );
}
