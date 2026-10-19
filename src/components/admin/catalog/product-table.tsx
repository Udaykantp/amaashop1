import { ChevronLeft, ChevronRight, PackageSearch } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/patterns/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductRowActions } from "@/components/admin/catalog/product-row-actions";
import { ProductStatusBadge } from "@/components/admin/catalog/product-status-badge";
import type { ProductListRow } from "@/server/catalog/products";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

function pageHref(params: Record<string, string | undefined>, page: number) {
  const sp = new URLSearchParams();
  for (const [k, val] of Object.entries(params)) if (val) sp.set(k, val);
  if (page > 1) sp.set("page", String(page));
  else sp.delete("page");
  const qs = sp.toString();
  return `/admin/catalog${qs ? `?${qs}` : ""}`;
}

export function ProductTable({
  rows,
  page,
  pageCount,
  total,
  query,
}: {
  rows: ProductListRow[];
  page: number;
  pageCount: number;
  total: number;
  query: Record<string, string | undefined>;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="No products match"
        action={
          <Link
            href="/admin/catalog/new"
            className="text-sm font-medium text-primary hover:underline"
          >
            Add a product
          </Link>
        }
      >
        Try clearing the filters, or create your first product.
      </EmptyState>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Product</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">PV / BV</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-muted">
                    {r.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/admin/catalog/${r.id}`}
                      className="block truncate font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {r.name}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.sku}
                      {r.isFeatured ? " · Featured" : ""}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <ProductStatusBadge status={r.status} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {r.categoryName ?? "—"}
              </TableCell>
              <TableCell className="text-right">
                <div className="tabular-nums">
                  {formatINR(r.sellingPrice)}
                  {r.discountPct > 0 ? (
                    <span className="ml-1 text-xs text-success">−{r.discountPct}%</span>
                  ) : null}
                </div>
                {r.discountPct > 0 ? (
                  <div className="text-xs text-muted-foreground line-through">
                    {formatINR(r.mrp)}
                  </div>
                ) : null}
              </TableCell>
              <TableCell className="text-right tabular-nums text-sm">
                {r.pv} / {r.bv}
              </TableCell>
              <TableCell
                className={cn(
                  "text-right tabular-nums text-sm",
                  r.stock <= 5 && "font-medium text-destructive",
                )}
              >
                {r.stock}
              </TableCell>
              <TableCell>
                <ProductRowActions id={r.id} slug={r.slug} status={r.status} name={r.name} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
        <span>
          {total} product{total === 1 ? "" : "s"} · page {page} of {pageCount}
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
