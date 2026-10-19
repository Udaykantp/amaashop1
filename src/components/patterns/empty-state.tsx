import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Instructional empty state (brief §5.2) — never a bare "No data". Tell the
 * member what will appear here and give them the action to make it happen.
 */
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
      ) : null}
      <p className="font-serif text-lg font-medium text-foreground">{title}</p>
      {children ? (
        <div className="mt-1.5 max-w-sm text-sm text-muted-foreground">{children}</div>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
