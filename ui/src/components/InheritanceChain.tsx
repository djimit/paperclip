import { ChevronRight } from "lucide-react";
import { Link } from "@/lib/router";
import { cn } from "@/lib/utils";

export type InheritanceChainItem = {
  label: string;
  detail?: string | null;
  href?: string | null;
  active?: boolean;
  unavailable?: boolean;
};

export function InheritanceChain({ items }: { items: InheritanceChainItem[] }) {
  return (
    <nav aria-label="Inheritance chain" className="flex flex-wrap items-center gap-1.5">
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex items-center gap-1.5">
          {index > 0 ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" /> : null}
          <InheritanceChainStep item={item} />
        </div>
      ))}
    </nav>
  );
}

function InheritanceChainStep({ item }: { item: InheritanceChainItem }) {
  const className = cn(
    "inline-flex min-h-8 max-w-full flex-col justify-center rounded-md border px-2.5 py-1 text-left text-xs transition-colors",
    item.active
      ? "border-primary/50 bg-primary/10 text-primary"
      : item.unavailable
        ? "border-dashed border-border bg-muted/30 text-muted-foreground"
        : "border-border bg-background text-foreground",
    item.href && !item.unavailable ? "hover:bg-accent/60" : null,
  );

  const content = (
    <>
      <span className="font-medium leading-tight">{item.label}</span>
      {item.detail ? <span className="mt-0.5 truncate text-[11px] leading-tight opacity-75">{item.detail}</span> : null}
    </>
  );

  if (item.href && !item.unavailable) {
    return (
      <Link to={item.href} className={className}>
        {content}
      </Link>
    );
  }

  return <span className={className}>{content}</span>;
}
