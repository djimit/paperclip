import { Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title?: string;
  message: string;
  action?: string;
  onAction?: () => void;
  actionHref?: string;
  actionIcon?: LucideIcon;
  tone?: "default" | "destructive";
}

export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
  onAction,
  actionHref,
  actionIcon: ActionIcon = Plus,
  tone = "default",
}: EmptyStateProps) {
  const isDestructive = tone === "destructive";

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className={isDestructive ? "bg-destructive/10 p-4 mb-4" : "bg-muted/50 p-4 mb-4"}>
        <Icon className={isDestructive ? "h-10 w-10 text-destructive/70" : "h-10 w-10 text-muted-foreground/50"} />
      </div>
      {title ? <h2 className={isDestructive ? "mb-2 text-sm font-semibold text-destructive" : "mb-2 text-sm font-semibold"}>{title}</h2> : null}
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      {action && actionHref ? (
        <Button variant={isDestructive ? "destructive" : "default"} asChild>
          <a href={actionHref}>
            <ActionIcon className="h-4 w-4 mr-1.5" />
            {action}
          </a>
        </Button>
      ) : null}
      {action && onAction && !actionHref ? (
        <Button variant={isDestructive ? "destructive" : "default"} onClick={onAction}>
          <ActionIcon className="h-4 w-4 mr-1.5" />
          {action}
        </Button>
      ) : null}
    </div>
  );
}
