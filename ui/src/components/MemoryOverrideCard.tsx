import { useEffect, useMemo, useState } from "react";
import type { MemoryBinding, MemoryResolvedBinding } from "@paperclipai/shared";
import { AlertCircle, Database } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { InheritanceChain } from "./InheritanceChain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const INHERIT_VALUE = "__inherit__";

type MemoryOverrideTargetType = "agent" | "project";

interface MemoryOverrideCardProps {
  targetType: MemoryOverrideTargetType;
  resolvedBinding: MemoryResolvedBinding | null | undefined;
  bindings: MemoryBinding[];
  source: MemoryResolvedBinding["source"] | null | undefined;
  onSave: (bindingId: string | null) => void;
  loading?: boolean;
  error?: Error | null;
  saving?: boolean;
  saveError?: Error | null;
  onRetry?: () => void;
  companySettingsHref?: string;
  agentOverrideCount?: number;
}

function targetLabel(targetType: MemoryOverrideTargetType) {
  return targetType === "agent" ? "agent" : "project";
}

function titleLabel(targetType: MemoryOverrideTargetType) {
  return targetType === "agent" ? "Agent memory" : "Project memory";
}

function overrideLabel(targetType: MemoryOverrideTargetType) {
  return targetType === "agent" ? "Agent override" : "Project override";
}

function inheritLabel(targetType: MemoryOverrideTargetType) {
  return targetType === "agent" ? "Inherit project/company default" : "Inherit company default";
}

function sourceLabel(source: MemoryResolvedBinding["source"] | null | undefined) {
  if (source === "agent_override") return "Agent override";
  if (source === "project_override") return "Project override";
  if (source === "company_default") return "Company default";
  if (source === "binding_key") return "Direct binding key";
  return "Unconfigured";
}

function describeBinding(binding: MemoryBinding | null | undefined, targetType: MemoryOverrideTargetType) {
  if (!binding) return `No memory binding resolves for this ${targetLabel(targetType)} yet.`;
  return `${binding.name ?? binding.key} (${binding.providerKey})`;
}

function selectedBindingLabel(binding: MemoryBinding | undefined, targetType: MemoryOverrideTargetType) {
  if (!binding) return inheritLabel(targetType);
  return `${binding.name ?? binding.key} (${binding.providerKey})`;
}

function bindingPreviewLabel(binding: MemoryBinding | null | undefined, fallback: string) {
  return binding ? `${binding.providerKey}:${binding.key}` : fallback;
}

function agentOverrideSummary(count: number | undefined) {
  if (typeof count !== "number") return null;
  return `${count} agent override${count === 1 ? "" : "s"} configured.`;
}

function bindingSelectionFromResolved(
  resolvedBinding: MemoryResolvedBinding | null | undefined,
  targetType: MemoryOverrideTargetType,
) {
  if (resolvedBinding?.targetType === targetType && resolvedBinding.binding) {
    return resolvedBinding.binding.id;
  }
  return INHERIT_VALUE;
}

export function MemoryOverrideCard({
  targetType,
  resolvedBinding,
  bindings,
  source,
  onSave,
  loading = false,
  error = null,
  saving = false,
  saveError = null,
  onRetry,
  companySettingsHref = "/company/settings#memory",
  agentOverrideCount,
}: MemoryOverrideCardProps) {
  const [selectedBindingId, setSelectedBindingId] = useState(INHERIT_VALUE);

  const currentSelection = useMemo(
    () => bindingSelectionFromResolved(resolvedBinding, targetType),
    [resolvedBinding, targetType],
  );

  useEffect(() => {
    setSelectedBindingId(currentSelection);
  }, [currentSelection]);

  const selectedBinding = bindings.find((binding) => binding.id === selectedBindingId);
  const hasUnsavedChange = selectedBindingId !== currentSelection;
  const chainSummary = agentOverrideSummary(agentOverrideCount);
  const nextBinding = selectedBindingId === INHERIT_VALUE ? null : selectedBinding;
  const inheritanceItems = [
    {
      label: "Company default",
      detail: source === "company_default" ? resolvedBinding?.binding?.providerKey : null,
      href: companySettingsHref,
      active: source === "company_default",
    },
    {
      label: "Project override",
      detail: targetType === "agent" ? "Issue/project scope" : "This project",
      active: source === "project_override",
    },
    {
      label: targetType === "project" ? "Agent overrides" : "Agent override",
      detail: targetType === "project" ? chainSummary : "This agent",
      active: source === "agent_override",
      unavailable: targetType === "project" && !agentOverrideCount,
    },
  ];

  if (loading) {
    return (
      <div className="rounded-md border border-border px-4 py-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 shrink-0" />
          <div className="min-w-0 flex-1 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-4 w-72 max-w-full" />
              <Skeleton className="h-3 w-52 max-w-full" />
            </div>
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-border px-4 py-4">
        <EmptyState
          icon={AlertCircle}
          message={error.message || `Could not load ${targetLabel(targetType)} memory settings.`}
          action={onRetry ? "Retry" : undefined}
          onAction={onRetry}
        />
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-muted-foreground">
          <Database className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-2">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">{titleLabel(targetType)}</h2>
              <p className="text-sm">{describeBinding(resolvedBinding?.binding, targetType)}</p>
              <p className="text-xs text-muted-foreground">Source: {sourceLabel(source)}</p>
            </div>

            <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2">
              <InheritanceChain items={inheritanceItems} />
            </div>
          </div>

          {bindings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-4 bg-muted/50 p-4">
                <Database className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                Create a memory binding before setting an override.
              </p>
              <Button asChild>
                <a href={companySettingsHref}>Create a binding in Company Settings</a>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{overrideLabel(targetType)}</label>
                  <Select value={selectedBindingId} onValueChange={setSelectedBindingId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={inheritLabel(targetType)} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={INHERIT_VALUE}>{inheritLabel(targetType)}</SelectItem>
                      {bindings.map((binding) => (
                        <SelectItem key={binding.id} value={binding.id}>
                          <BindingSelectLabel binding={binding} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  disabled={saving || !hasUnsavedChange}
                  onClick={() => onSave(selectedBindingId === INHERIT_VALUE ? null : selectedBindingId)}
                >
                  {saving ? "Saving..." : "Save override"}
                </Button>
              </div>

              {hasUnsavedChange ? (
                <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
                  <span>New runs will use</span>
                  <Badge variant="outline" className="border-primary/30 bg-background text-primary">
                    {bindingPreviewLabel(nextBinding, selectedBindingLabel(selectedBinding, targetType))}
                  </Badge>
                  <span>instead of</span>
                  <Badge variant="outline" className="border-primary/30 bg-background text-primary">
                    {bindingPreviewLabel(resolvedBinding?.binding, "no binding")}
                  </Badge>
                  <span>Switching will not affect existing records.</span>
                </div>
              ) : null}

              {saveError ? (
                <p className="text-xs text-destructive">{saveError.message}</p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BindingSelectLabel({ binding }: { binding: MemoryBinding }) {
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <span className="min-w-0">
        <span className="block truncate">{binding.name ?? binding.key}</span>
        <span className="block truncate text-xs text-muted-foreground">{binding.providerKey}</span>
      </span>
      <span
        className={
          binding.enabled
            ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-300"
            : "rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-700 dark:text-amber-300"
        }
      >
        {binding.enabled ? "Enabled" : "Disabled"}
      </span>
    </div>
  );
}
