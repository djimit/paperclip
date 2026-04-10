import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  MemoryBinding,
  MemoryProviderDescriptor,
} from "@paperclipai/shared";
import { memoryApi } from "../api/memory";
import { useToast } from "../context/ToastContext";
import { queryKeys } from "../lib/queryKeys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const DEFAULT_LOCAL_BASIC_CONFIG = {
  enablePreRunHydrate: true,
  enablePostRunCapture: true,
  enableIssueCommentCapture: false,
  enableIssueDocumentCapture: true,
  maxHydrateSnippets: 5,
};

function prettyJson(value: Record<string, unknown>) {
  return JSON.stringify(value, null, 2);
}

function parseConfigText(configText: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(configText);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Config must be valid JSON");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Config must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

function describeBindingConfig(binding: MemoryBinding) {
  if (binding.providerKey !== "local_basic") {
    const keys = Object.keys(binding.config ?? {});
    return keys.length > 0 ? `${keys.length} config field${keys.length === 1 ? "" : "s"}` : "Default config";
  }

  const config = { ...DEFAULT_LOCAL_BASIC_CONFIG, ...binding.config };
  return [
    config.enablePreRunHydrate ? "pre-run hydrate on" : "pre-run hydrate off",
    config.enablePostRunCapture ? "post-run capture on" : "post-run capture off",
    config.enableIssueDocumentCapture ? "issue docs on" : "issue docs off",
    config.enableIssueCommentCapture ? "comments on" : "comments off",
    `top ${String(config.maxHydrateSnippets)} snippets`,
  ].join(" • ");
}

function providerLabel(provider: MemoryProviderDescriptor | undefined, binding: MemoryBinding) {
  return provider?.displayName ?? binding.providerKey;
}

function providerDescription(provider: MemoryProviderDescriptor | undefined) {
  return provider?.description ?? "Memory provider";
}

function MemoryBindingCard({
  binding,
  isDefault,
  overrideCount,
  provider,
  onSetDefault,
}: {
  binding: MemoryBinding;
  isDefault: boolean;
  overrideCount: number;
  provider?: MemoryProviderDescriptor;
  onSetDefault: (bindingId: string) => void;
}) {
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState(binding.name ?? "");
  const [enabled, setEnabled] = useState(binding.enabled);
  const [configText, setConfigText] = useState(prettyJson(binding.config ?? {}));
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    setName(binding.name ?? "");
    setEnabled(binding.enabled);
    setConfigText(prettyJson(binding.config ?? {}));
    setConfigError(null);
  }, [binding]);

  const dirty =
    name !== (binding.name ?? "")
    || enabled !== binding.enabled
    || configText !== prettyJson(binding.config ?? {});

  const updateBinding = useMutation({
    mutationFn: async () => {
      const config = parseConfigText(configText);
      return memoryApi.updateBinding(binding.id, {
        name: name.trim() || null,
        enabled,
        config,
      });
    },
    onSuccess: async () => {
      setConfigError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.memory.all });
      pushToast({
        title: "Memory binding updated",
        body: `${binding.key} saved successfully.`,
        tone: "success",
      });
    },
    onError: (error) => {
      pushToast({
        title: "Failed to update memory binding",
        body: error instanceof Error ? error.message : "Unknown error",
        tone: "error",
      });
    },
  });

  return (
    <div className="rounded-md border border-border px-4 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium">{binding.name ?? binding.key}</h3>
            <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] text-muted-foreground">
              {providerLabel(provider, binding)}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] ${
                binding.enabled
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
              }`}
            >
              {binding.enabled ? "Enabled" : "Disabled"}
            </span>
            {isDefault && (
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] text-blue-700 dark:text-blue-300">
                Company default
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">Key: {binding.key}</div>
          <div className="text-xs text-muted-foreground">{providerDescription(provider)}</div>
          <div className="text-xs text-muted-foreground">{describeBindingConfig(binding)}</div>
          <div className="text-xs text-muted-foreground">
            {overrideCount > 0 ? `${overrideCount} agent override${overrideCount === 1 ? "" : "s"}` : "No agent overrides"}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={isDefault}
          onClick={() => onSetDefault(binding.id)}
        >
          {isDefault ? "Default" : "Set as default"}
        </Button>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Display name</label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Optional label"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
            />
            Enabled
          </label>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Provider config JSON</label>
          <Textarea
            value={configText}
            onChange={(event) => {
              setConfigText(event.target.value);
              setConfigError(null);
            }}
            className="min-h-44 font-mono text-xs"
          />
          {configError && <p className="text-xs text-destructive">{configError}</p>}
          {updateBinding.isError && !configError && (
            <p className="text-xs text-destructive">
              {updateBinding.error instanceof Error ? updateBinding.error.message : "Failed to update binding"}
            </p>
          )}
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!dirty || updateBinding.isPending}
            onClick={() => {
              try {
                parseConfigText(configText);
                setConfigError(null);
                updateBinding.mutate();
              } catch (error) {
                setConfigError(error instanceof Error ? error.message : "Config must be valid JSON");
              }
            }}
          >
            {updateBinding.isPending ? "Saving..." : "Save binding"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CompanyMemorySettings({ companyId }: { companyId: string }) {
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const [key, setKey] = useState("default-memory");
  const [name, setName] = useState("Default memory");
  const [providerKey, setProviderKey] = useState("local_basic");
  const [configText, setConfigText] = useState(prettyJson(DEFAULT_LOCAL_BASIC_CONFIG));
  const [enabled, setEnabled] = useState(true);
  const [makeDefault, setMakeDefault] = useState(true);
  const [createError, setCreateError] = useState<string | null>(null);

  const providersQuery = useQuery({
    queryKey: queryKeys.memory.providers(companyId),
    queryFn: () => memoryApi.providers(companyId),
  });

  const bindingsQuery = useQuery({
    queryKey: queryKeys.memory.bindings(companyId),
    queryFn: () => memoryApi.listBindings(companyId),
  });

  const targetsQuery = useQuery({
    queryKey: queryKeys.memory.targets(companyId),
    queryFn: () => memoryApi.listTargets(companyId),
  });

  const providersByKey = useMemo(
    () => new Map((providersQuery.data ?? []).map((provider) => [provider.key, provider])),
    [providersQuery.data],
  );

  const defaultBindingId =
    targetsQuery.data?.find((target) => target.targetType === "company" && target.targetId === companyId)?.bindingId ?? null;

  const overrideCountByBindingId = useMemo(() => {
    const result = new Map<string, number>();
    for (const target of targetsQuery.data ?? []) {
      if (target.targetType !== "agent") continue;
      result.set(target.bindingId, (result.get(target.bindingId) ?? 0) + 1);
    }
    return result;
  }, [targetsQuery.data]);

  useEffect(() => {
    if (!providersQuery.data?.length) return;
    if (providersQuery.data.some((provider) => provider.key === providerKey)) return;
    setProviderKey(providersQuery.data[0]!.key);
  }, [providerKey, providersQuery.data]);

  const createBinding = useMutation({
    mutationFn: async () => {
      const config = parseConfigText(configText);
      const created = await memoryApi.createBinding(companyId, {
        key: key.trim(),
        name: name.trim() || null,
        providerKey,
        config,
        enabled,
      });
      if (makeDefault) {
        await memoryApi.setCompanyDefault(companyId, created.id);
      }
      return created;
    },
    onSuccess: async () => {
      setCreateError(null);
      setKey("default-memory");
      setName("Default memory");
      setConfigText(prettyJson(DEFAULT_LOCAL_BASIC_CONFIG));
      setEnabled(true);
      setMakeDefault(true);
      await queryClient.invalidateQueries({ queryKey: queryKeys.memory.all });
      pushToast({
        title: "Memory binding created",
        body: "The new binding is ready for company and agent scopes.",
        tone: "success",
      });
    },
    onError: (error) => {
      pushToast({
        title: "Failed to create memory binding",
        body: error instanceof Error ? error.message : "Unknown error",
        tone: "error",
      });
    },
  });

  const setCompanyDefault = useMutation({
    mutationFn: (bindingId: string) => memoryApi.setCompanyDefault(companyId, bindingId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.memory.all });
      pushToast({
        title: "Company default updated",
        body: "New runs will resolve memory through the selected binding.",
        tone: "success",
      });
    },
    onError: (error) => {
      pushToast({
        title: "Failed to update company memory default",
        body: error instanceof Error ? error.message : "Unknown error",
        tone: "error",
      });
    },
  });

  const isLoading = providersQuery.isLoading || bindingsQuery.isLoading || targetsQuery.isLoading;
  const error = providersQuery.error ?? bindingsQuery.error ?? targetsQuery.error ?? null;

  return (
    <div className="space-y-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Memory
      </div>
      <div className="space-y-4 rounded-md border border-border px-4 py-4">
        <div className="space-y-1">
          <h2 className="text-sm font-medium">Company memory bindings</h2>
          <p className="text-sm text-muted-foreground">
            Bindings determine where agent memory is hydrated from and where run summaries, issue documents, and other captured context are written.
          </p>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading memory settings...</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error.message}</p>
        ) : (
          <>
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Binding key</label>
                  <Input value={key} onChange={(event) => setKey(event.target.value)} placeholder="default-memory" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Display name</label>
                  <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Default memory" />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Provider</label>
                  <select
                    value={providerKey}
                    onChange={(event) => setProviderKey(event.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
                  >
                    {(providersQuery.data ?? []).map((provider) => (
                      <option key={provider.key} value={provider.key}>
                        {provider.displayName}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(event) => setEnabled(event.target.checked)}
                  />
                  Enabled
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={makeDefault}
                    onChange={(event) => setMakeDefault(event.target.checked)}
                  />
                  Set as company default
                </label>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Config JSON</label>
                <Textarea
                  value={configText}
                  onChange={(event) => {
                    setConfigText(event.target.value);
                    setCreateError(null);
                  }}
                  className="min-h-44 font-mono text-xs"
                />
                {createError && <p className="text-xs text-destructive">{createError}</p>}
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  disabled={!key.trim() || !providerKey || createBinding.isPending}
                  onClick={() => {
                    try {
                      parseConfigText(configText);
                      setCreateError(null);
                      createBinding.mutate();
                    } catch (error) {
                      setCreateError(error instanceof Error ? error.message : "Config must be valid JSON");
                    }
                  }}
                >
                  {createBinding.isPending ? "Creating..." : "Create binding"}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Existing bindings</h3>
                <div className="text-xs text-muted-foreground">
                  {defaultBindingId ? "A company default is configured." : "No company default yet."}
                </div>
              </div>
              {(bindingsQuery.data ?? []).length === 0 ? (
                <div className="rounded-md border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                  Create a binding to enable memory hydration and capture for this company.
                </div>
              ) : (
                <div className="space-y-3">
                  {(bindingsQuery.data ?? []).map((binding) => (
                    <MemoryBindingCard
                      key={binding.id}
                      binding={binding}
                      isDefault={binding.id === defaultBindingId}
                      overrideCount={overrideCountByBindingId.get(binding.id) ?? 0}
                      provider={providersByKey.get(binding.providerKey)}
                      onSetDefault={(bindingId) => setCompanyDefault.mutate(bindingId)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
