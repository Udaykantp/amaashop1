import type { OrderStatus, OrderType } from "@/server/enums";
import { ConnectBackend } from "@/components/admin/connect-backend";
import { OrderFilters } from "@/components/admin/orders/order-filters";
import { OrderTable } from "@/components/admin/orders/order-table";
import { PageHeader } from "@/components/patterns/page-header";
import { adminGuardCap } from "@/server/admin/context";
import { listOrders } from "@/server/admin/orders";

export const metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

const STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
];
const TYPES: OrderType[] = ["STOREFRONT", "REPURCHASE", "JOINING"];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const gate = await adminGuardCap("order.view");
  if (gate.preview) return <ConnectBackend missing={gate.missing} />;

  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : (sp[k] as string | undefined));

  const q = one("q");
  const statusParam = one("status");
  const status = STATUSES.includes(statusParam as OrderStatus)
    ? (statusParam as OrderStatus)
    : ("ALL" as const);
  const typeParam = one("type");
  const type = TYPES.includes(typeParam as OrderType) ? (typeParam as OrderType) : ("ALL" as const);
  const page = Math.max(1, Number(one("page")) || 1);

  const { list, total, pageCount } = await listOrders({ q, status, type, page, perPage: 20 });

  return (
    <>
      <PageHeader
        title="Orders"
        description="Storefront and repurchase orders, from placement through dispatch — with GST invoices where issued."
      />

      <OrderFilters />

      <OrderTable
        rows={list}
        page={page}
        pageCount={pageCount}
        total={total}
        query={{
          q,
          status: status === "ALL" ? undefined : status,
          type: type === "ALL" ? undefined : type,
        }}
      />
    </>
  );
}
