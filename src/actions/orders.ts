"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { OrderStatus } from "@/server/enums";
import { AuthError, requireCapability } from "@/server/auth/guards";
import { writeAudit } from "@/server/audit";
import { Collections, doc, nowSentinel } from "@/server/firestore";
import type { OrderDoc } from "@/server/models";
import { log } from "@/server/log";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

/**
 * The order lifecycle is a forward-moving state machine plus two exits:
 * CANCELLED (only before it's shipped) and REFUNDED (once money has actually
 * moved, i.e. from CONFIRMED onward). Nothing here triggers commission
 * clawback or wallet adjustments yet — that domain-event pipeline
 * (ORDER_CANCELLED -> clawback, per docs/BUILD-PLAN.md Phase 4) isn't built.
 * This only ever changes `Order.status` and leaves an audit trail.
 */
const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED", "REFUNDED"],
  PROCESSING: ["SHIPPED", "CANCELLED", "REFUNDED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: ["REFUNDED"],
  REFUNDED: [],
};

const statusSchema = z.enum(["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]);

export async function setOrderStatusAction(orderId: string, nextStatus: string): Promise<ActionResult> {
  try {
    const actor = await requireCapability("order.track");
    const parsed = statusSchema.parse(nextStatus);

    const ref = doc(Collections.orders, orderId);
    const snap = await ref.get();
    if (!snap.exists) return { ok: false, error: "Order not found." };
    const before = snap.data() as OrderDoc;

    const allowed = NEXT_STATUS[before.status];
    if (!allowed.includes(parsed)) {
      return {
        ok: false,
        error: `Can't move ${before.orderNo} from ${before.status.toLowerCase()} to ${parsed.toLowerCase()}.`,
      };
    }

    await ref.update({
      status: parsed,
      ...(parsed === "CONFIRMED" ? { confirmedAt: nowSentinel() } : {}),
      ...(parsed === "CANCELLED" ? { cancelledAt: nowSentinel() } : {}),
    });

    await writeAudit({
      actorUserId: actor.uid,
      action: "order.status.update",
      entity: "order",
      entityId: orderId,
      before: { status: before.status },
      after: { status: parsed },
    });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true, message: `${before.orderNo} marked ${parsed.toLowerCase()}.` };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    if (err instanceof z.ZodError) return { ok: false, error: "Invalid status." };
    log.error("order status update failed", { err: String(err) });
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
