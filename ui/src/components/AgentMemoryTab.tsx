import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MemoryOperation } from "@paperclipai/shared";
import { AlertCircle, Database, RefreshCw } from "lucide-react";
import { memoryApi } from "../api/memory";
import { EmptyState } from "./EmptyState";
import { MemoryRecordRow } from "./MemoryRecordRow";
import { MemoryOverrideCard } from "./MemoryOverrideCard";
import { StatusBadge } from "./StatusBadge";
import { Badge } from "@/components/ui/badge";
import { useToast } from "../context/ToastContext";
import { queryKeys } from "../lib/queryKeys";
import { formatCents, relativeTime } from "../lib/utils";
import { Link } from "@/lib/router";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

function operationCost(operation: MemoryOperation) {
  const total = operation.usage.reduce((sum, item) => sum + item.costCents, 0);
  return total > 0 ? formatCents(total) : "-";
}

const OPERATION_WINDOWS = {
  "24h": { label: "Last 24h", ms: 24 * 60 * 60 * 1000 },
  "7d": { label: "7d", ms: 7 * 24 * 60 * 60 * 1000 },
  "30d": { label: "30d", ms: 30 * 24 * 60 * 60 * 1000 },
} as const;

type OperationWindow = keyof typeof OPERATION_WINDOWS;

function filterOperationsByWindow(operations: MemoryOperation[], window: OperationWindow) {
  const cutoff = Date.now() - OPERATION_WINDOWS[window].ms;
  return operations.filter((operation) => new Date(operation.occurredAt).getTime() >= cutoff);
}

function MemoryRowsSkeleton() {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      {[0, 1, 2].map((index) => (
        <div key={index} className="grid gap-3 border-b border-border px-4 py-4 last:border-b-0 lg:grid-cols-[1fr_190px_140px]">
          <div className="space-y-2">
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="space-y-2 lg:ml-auto">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

function OperationRowsSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className="grid grid-cols-6 gap-3 border-b border-border px-3 py-2 last:border-b-0">
          <Skeleton className="col-span-2 h-5" />
          <Skeleton className="h-5" />
          <Skeleton className="h-5" />
          <Skeleton className="h-5" />
          <Skeleton className="h-5" />
        </div>
      ))}
    </div>
  );
}

export function AgentMemoryTab({
  companyId,
  agentId,
}: {
  companyId: string;
  agentId: string;
}) {
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const [operationWindow, setOperationWindow] = useState<OperationWindow>("24h");

  const bindingsQuery = useQuery({
    queryKey: queryKeys.memory.bindings(companyId),
    queryFn: () => memoryApi.listBindings(companyId),
  });

  const resolvedBindingQuery = useQuery({
    queryKey: queryKeys.memory.agentBinding(agentId),
    queryFn: () => memoryApi.getAgentBinding(agentId),
  });

  const recordsQuery = useQuery({
    queryKey: queryKeys.memory.records(companyId, { agentId, includeDeleted: false, limit: 20 }),
    queryFn: () => memoryApi.listRecords(companyId, { agentId, includeDeleted: false, limit: 20 }),
  });

  const operationsQuery = useQuery({
    queryKey: queryKeys.memory.operations(companyId, { agentId, limit: 100 }),
    queryFn: () => memoryApi.listOperations(companyId, { agentId, limit: 100 }),
  });

  const saveOverride = useMutation({
    mutationFn: (bindingId: string | null) => memoryApi.setAgentBinding(agentId, bindingId),
    onSuccess: async (_target, bindingId) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.memory.all });
      pushToast({
        title: "Agent memory binding updated",
        body: bindingId === null
          ? "This agent now inherits the company default binding."
          : "The agent override is active for subsequent memory operations.",
        tone: "success",
      });
    },
    onError: (error) => {
      pushToast({
        title: "Failed to update agent memory binding",
        body: error instanceof Error ? error.message : "Unknown error",
        tone: "error",
      });
    },
  });

  const overrideLoading = bindingsQuery.isLoading || resolvedBindingQuery.isLoading;
  const overrideError = bindingsQuery.error ?? resolvedBindingQuery.error ?? null;
  const recordsLoading = recordsQuery.isLoading;
  const operationsLoading = operationsQuery.isLoading;
  const recordsError = recordsQuery.error ?? null;
  const operationsError = operationsQuery.error ?? null;
  const bindingsById = useMemo(
    () => new Map((bindingsQuery.data ?? []).map((binding) => [binding.id, binding])),
    [bindingsQuery.data],
  );
  const filteredOperations = useMemo(
    () => filterOperationsByWindow(operationsQuery.data ?? [], operationWindow),
    [operationWindow, operationsQuery.data],
  );
  const fullFeedHref = `/memories?agentId=${encodeURIComponent(agentId)}`;

  return (
    <div className="space-y-6">
      <MemoryOverrideCard
        targetType="agent"
        resolvedBinding={resolvedBindingQuery.data}
        bindings={bindingsQuery.data ?? []}
        source={resolvedBindingQuery.data?.source}
        loading={overrideLoading}
        error={overrideError}
        saving={saveOverride.isPending}
        saveError={saveOverride.error instanceof Error ? saveOverride.error : null}
        onRetry={() => {
          void bindingsQuery.refetch();
          void resolvedBindingQuery.refetch();
        }}
        onSave={(bindingId) => saveOverride.mutate(bindingId)}
      />

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-medium">Recent memory records</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-muted-foreground">Showing 20 most recent</Badge>
            <Link className="text-xs text-primary hover:underline" to={fullFeedHref}>
              Open full feed
            </Link>
          </div>
        </div>
        {recordsLoading ? (
          <MemoryRowsSkeleton />
        ) : recordsError ? (
          <div className="rounded-md border border-destructive/30">
            <EmptyState
              icon={AlertCircle}
              title="Could not load memory records"
              message={recordsError.message}
              action="Retry"
              actionIcon={RefreshCw}
              onAction={() => void recordsQuery.refetch()}
              tone="destructive"
            />
          </div>
        ) : (recordsQuery.data ?? []).length === 0 ? (
          <div className="rounded-md border border-dashed border-border">
            <EmptyState
              icon={Database}
              message="No memory has been captured for this agent yet."
            />
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            <div className="divide-y divide-border">
            {(recordsQuery.data ?? []).map((record) => (
              <MemoryRecordRow
                key={record.id}
                record={record}
                binding={bindingsById.get(record.bindingId)}
                variant="compact"
              />
            ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-medium">Recent memory operations</h3>
            <div className="text-xs text-muted-foreground">Queries, captures, and forgets for this agent</div>
          </div>
          <Tabs value={operationWindow} onValueChange={(value) => setOperationWindow(value as OperationWindow)}>
            <TabsList>
              {(Object.entries(OPERATION_WINDOWS) as Array<[OperationWindow, { label: string; ms: number }]>).map(([value, option]) => (
                <TabsTrigger key={value} value={value}>{option.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        {operationsLoading ? (
          <OperationRowsSkeleton />
        ) : operationsError ? (
          <div className="rounded-md border border-destructive/30">
            <EmptyState
              icon={AlertCircle}
              title="Could not load memory operations"
              message={operationsError.message}
              action="Retry"
              actionIcon={RefreshCw}
              onAction={() => void operationsQuery.refetch()}
              tone="destructive"
            />
          </div>
        ) : filteredOperations.length === 0 ? (
          <div className="rounded-md border border-dashed border-border">
            <EmptyState
              icon={Database}
              message={(operationsQuery.data ?? []).length === 0
                ? "No memory operations logged yet."
                : `No memory operations in the ${OPERATION_WINDOWS[operationWindow].label.toLowerCase()} window.`}
            />
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="border-b border-border bg-accent/20">
                <tr className="text-left text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Operation</th>
                  <th className="px-3 py-2 font-medium">Hook</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium text-right">Records</th>
                  <th className="px-3 py-2 font-medium text-right">Cost</th>
                  <th className="px-3 py-2 font-medium text-right">When</th>
                </tr>
              </thead>
              <tbody>
                {filteredOperations.map((operation) => (
                  <tr key={operation.id} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2">
                      <div className="font-medium">{operation.operationType}</div>
                      <div className="text-xs text-muted-foreground">{operation.providerKey}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {operation.hookKind ?? operation.triggerKind}
                    </td>
                    <td className="px-3 py-2"><StatusBadge status={operation.status} /></td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{operation.recordCount}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{operationCost(operation)}</td>
                    <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                      {relativeTime(operation.occurredAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
