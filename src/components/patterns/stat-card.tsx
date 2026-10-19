import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Dashboard "how am I doing" tile (brief §5.3). One number, one label, an
 * optional next-step hint. Deliberately restrained — these sit next to money.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  emphasis = false,
  footer,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: LucideIcon;
  emphasis?: boolean;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "flex flex-col gap-1 p-5 shadow-card",
        emphasis && "border-primary/20 bg-primary/[0.03]",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" aria-hidden /> : null}
      </div>
      <div className="mt-0.5 text-2xl font-semibold tabular-nums text-foreground">{value}</div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {footer ? <div className="mt-3">{footer}</div> : null}
    </Card>
  );
}
