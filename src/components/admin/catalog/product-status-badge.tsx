import type { ProductStatus } from "@/server/enums";
import { cn } from "@/lib/utils";

const MAP: Record<ProductStatus, { label: string; cls: string }> = {
  DRAFT: { label: "Draft", cls: "bg-muted text-muted-foreground" },
  ACTIVE: { label: "Active", cls: "bg-success/10 text-success" },
  ARCHIVED: { label: "Archived", cls: "bg-destructive/10 text-destructive" },
};

export function ProductStatusBadge({
  status,
  className,
}: {
  status: ProductStatus;
  className?: string;
}) {
  const { label, cls } = MAP[status];
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium",
        cls,
        className,
      )}
    >
      {label}
    </span>
  );
}
