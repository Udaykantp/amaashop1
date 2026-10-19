"use client";

import type { OrderStatus } from "@/server/enums";
import { setOrderStatusAction } from "@/actions/orders";
import { useAdminAction } from "@/components/admin/use-admin-action";
import { Button } from "@/components/ui/button";

type Option = { status: OrderStatus; label: string; variant?: "default" | "destructive" | "outline" };

const NEXT_OPTIONS: Record<OrderStatus, Option[]> = {
  PENDING: [
    { status: "CONFIRMED", label: "Confirm order" },
    { status: "CANCELLED", label: "Cancel order", variant: "destructive" },
  ],
  CONFIRMED: [
    { status: "PROCESSING", label: "Start processing" },
    { status: "CANCELLED", label: "Cancel order", variant: "destructive" },
  ],
  PROCESSING: [
    { status: "SHIPPED", label: "Mark shipped" },
    { status: "CANCELLED", label: "Cancel order", variant: "destructive" },
  ],
  SHIPPED: [{ status: "DELIVERED", label: "Mark delivered" }],
  DELIVERED: [{ status: "REFUNDED", label: "Mark refunded", variant: "outline" }],
  CANCELLED: [{ status: "REFUNDED", label: "Mark refunded", variant: "outline" }],
  REFUNDED: [],
};

export function OrderStatusActions({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const { pending, run } = useAdminAction();
  const options = NEXT_OPTIONS[status];

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {status === "REFUNDED" ? "This order is fully refunded — nothing further to do." : "No further status changes."}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Button
          key={o.status}
          size="sm"
          variant={o.variant ?? "default"}
          disabled={pending}
          onClick={() => run(() => setOrderStatusAction(orderId, o.status))}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}
