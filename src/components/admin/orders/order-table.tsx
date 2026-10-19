import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/admin/status-badge";
import { EmptyState } from "@/components/patterns/empty-state";
import { MoneyAmount } from "@/components/patterns/money-amount";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRelativeTime } from "@/lib/member/time";
import { cn } from "@/lib/utils";
import type { OrderListRow } from "@/server/admin/orders";

const TYPE_LABEL: Record<string, string> = {
  STOREFRONT: "Storefront",
  REPURCHASE: "Repurchase",
  JOINING: "Joining",
};

function pageHref(params: Record<string, string | undefined>, page: number) {
  const sp = new URLSearchParams();
  for (const [k, val] of Object.entries(params)) if (val) sp.set(k, val);
  if (page > 1) sp.set("page", String(page));
  else sp.delete("page");
  const qs = sp.toString();
  return `/admin/orders${qs ? `?${qs}` : ""}`;
}

export function OrderTable({
  rows,
  page,
  pageCount,
  total,
  query,
}: {
  rows: OrderListRow[];
  page: number;
  pageCount: number;
  total: number;
  query: Record<string, string | undefined>;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState icon={ShoppingBag} title="No orders match">
        Orders placed on the storefront (or by distributors repurchasing) will show up here.
      </EmptyState>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead className="text-right">Items</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Placed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <Link
                  href={`/admin/orders/${r.id}`}
                  className="font-mono text-sm font-medium text-primary hover:underline"
                >
                  {r.orderNo}
                </Link>
              </TableCell>
              <TableCell>
                <div className="text-sm">{r.customerName}</div>
                <div className="text-xs text-muted-foreground">{r.customerEmail}</div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {TYPE_LABEL[r.type] ?? r.type}
              </TableCell>
              <TableCell>
                <StatusBadge value={r.status} />
              </TableCell>
              <TableCell>
                {r.paymentStatus ? (
                  <StatusBadge value={r.paymentStatus} />
                ) : (
                  <span className="text-xs text-muted-foreground">No payment yet</span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">{r.itemCount}</TableCell>
              <TableCell className="text-right">
                <MoneyAmount value={r.total} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                {formatRelativeTime(r.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
        <span>
          {total} order{total === 1 ? "" : "s"} · page {page} of {pageCount}
        </span>
        <div className="flex gap-1">
          <Link
            aria-disabled={page <= 1}
            href={pageHref(query, page - 1)}
            className={cn(
              "inline-flex h-8 items-center gap-1 rounded-md border px-2",
              page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-secondary",
            )}
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </Link>
          <Link
            aria-disabled={page >= pageCount}
            href={pageHref(query, page + 1)}
            className={cn(
              "inline-flex h-8 items-center gap-1 rounded-md border px-2",
              page >= pageCount ? "pointer-events-none opacity-40" : "hover:bg-secondary",
            )}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
