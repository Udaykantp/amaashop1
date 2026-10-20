import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ConnectBackend } from "@/components/admin/connect-backend";
import { StatusBadge } from "@/components/admin/status-badge";
import { OrderStatusActions } from "@/components/admin/orders/order-status-actions";
import { MoneyAmount } from "@/components/patterns/money-amount";
import { PageHeader } from "@/components/patterns/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminGuardCap } from "@/server/admin/context";
import { getOrderDetail } from "@/server/admin/orders";
import { can } from "@/server/rbac";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  STOREFRONT: "Storefront",
  REPURCHASE: "Repurchase",
  JOINING: "Joining",
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderDetail(id).catch(() => null);
  return { title: order ? `${order.orderNo} · Orders` : "Order" };
}

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const gate = await adminGuardCap("order.view");
  if (gate.preview) return <ConnectBackend missing={gate.missing} />;

  const { id } = await params;
  const order = await getOrderDetail(id);
  if (!order) notFound();

  const canTrack = can(gate.user, "order.track");
  const addr = order.shippingAddress;
  const addrLine2 = [addr.city, addr.state, addr.pincode].filter(Boolean).join(", ");

  return (
    <>
      <Link
        href="/admin/orders"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All orders
      </Link>
      <PageHeader
        title={order.orderNo}
        description={`Placed ${new Date(order.createdAt).toLocaleString("en-IN")} · ${TYPE_LABEL[order.type] ?? order.type} order`}
        action={<StatusBadge value={order.status} />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm">Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Row k="Name" v={order.customer.name} />
            <Row k="Email" v={order.customer.email} />
            <Row k="Phone" v={order.customer.phone ?? "—"} />
            {order.placedByMember ? (
              <Row
                k="Placed by"
                v={
                  <Link
                    className="font-mono text-primary hover:underline"
                    href={`/admin/members/${order.placedByMember.id}`}
                  >
                    {order.placedByMember.memberCode}
                  </Link>
                }
              />
            ) : null}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm">Shipping address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-foreground">
            {addr.line1 ? <p>{addr.line1}</p> : null}
            {addr.line2 ? <p>{addr.line2}</p> : null}
            <p>{addrLine2 || "—"}</p>
            {"country" in addr && (addr as { country?: string }).country ? (
              <p>{(addr as { country?: string }).country}</p>
            ) : null}
            {order.buyerStateCode ? (
              <p className="pt-1 text-xs text-muted-foreground">GST state code: {order.buyerStateCode}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm">Order total</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Row k="Subtotal" v={<MoneyAmount value={order.totals.subtotal} size="sm" />} />
            <Row k="Discount" v={<MoneyAmount value={order.totals.discount} size="sm" tone="debit" />} />
            <Row k="Shipping" v={<MoneyAmount value={order.totals.shipping} size="sm" />} />
            <Row k="Tax (GST)" v={<MoneyAmount value={order.totals.tax} size="sm" />} />
            {Number(order.totals.walletApplied) > 0 ? (
              <Row k="Wallet applied" v={<MoneyAmount value={order.totals.walletApplied} size="sm" tone="debit" />} />
            ) : null}
            <div className="mt-2 border-t pt-2">
              <Row k="Total" v={<MoneyAmount value={order.totals.total} size="md" />} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-serif text-base font-medium">Items ({order.items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Line total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{item.sku}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{item.qty}</TableCell>
                    <TableCell className="text-right">
                      <MoneyAmount value={item.unitPrice} size="sm" />
                    </TableCell>
                    <TableCell className="text-right">
                      <MoneyAmount value={item.lineTax} size="sm" />
                    </TableCell>
                    <TableCell className="text-right">
                      <MoneyAmount value={item.lineTotal} size="sm" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-serif text-base font-medium">Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {order.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payment recorded yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">{p.method ?? p.provider}</TableCell>
                      <TableCell>
                        <StatusBadge value={p.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <MoneyAmount value={p.amount} size="sm" />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(p.createdAt).toLocaleString("en-IN")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-serif text-base font-medium">GST invoice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {order.gstInvoice ? (
              <>
                <Row k="Invoice no." v={order.gstInvoice.invoiceNo} />
                <Row k="Place of supply" v={order.gstInvoice.placeOfSupply} />
                <Row k="Type" v={order.gstInvoice.isInterState ? "Inter-state (IGST)" : "Intra-state (CGST+SGST)"} />
                {order.gstInvoice.isInterState ? (
                  <Row k="IGST" v={<MoneyAmount value={order.gstInvoice.igst} size="sm" />} />
                ) : (
                  <>
                    <Row k="CGST" v={<MoneyAmount value={order.gstInvoice.cgst} size="sm" />} />
                    <Row k="SGST" v={<MoneyAmount value={order.gstInvoice.sgst} size="sm" />} />
                  </>
                )}
                <Row k="Invoice total" v={<MoneyAmount value={order.gstInvoice.total} size="sm" />} />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Not yet issued.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {canTrack ? (
        <div className="mt-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-serif text-base font-medium">Update status</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderStatusActions orderId={order.id} status={order.status} />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-medium text-foreground">{v}</span>
    </div>
  );
}
