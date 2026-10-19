import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Every rupee on screen goes through this so money is visually consistent and
 * always tabular-aligned (brief §5.1). `tone` colours credits vs debits;
 * `size` covers a ledger row up to a dashboard hero figure.
 */
export function MoneyAmount({
  value,
  tone = "neutral",
  size = "md",
  showSign = false,
  className,
}: {
  value: number | string;
  tone?: "neutral" | "credit" | "debit" | "muted";
  size?: "sm" | "md" | "lg" | "xl";
  showSign?: boolean;
  className?: string;
}) {
  const n = typeof value === "string" ? Number(value) : value;
  const sign = showSign && n > 0 ? "+" : "";

  return (
    <span
      data-money
      className={cn(
        "font-medium tabular-nums",
        {
          "text-foreground": tone === "neutral",
          "text-success": tone === "credit",
          "text-destructive": tone === "debit",
          "text-muted-foreground": tone === "muted",
        },
        {
          "text-sm": size === "sm",
          "text-base": size === "md",
          "text-2xl font-semibold": size === "lg",
          "font-serif text-4xl font-semibold tracking-tight": size === "xl",
        },
        className,
      )}
    >
      {sign}
      {formatINR(n)}
    </span>
  );
}
