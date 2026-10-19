import "server-only";
import { headers } from "next/headers";
import { Collections, collection, nowSentinel } from "@/server/firestore";
import type { AuditLogDoc } from "@/server/models";
import { log } from "@/server/log";

/**
 * Append-only audit trail for every mutating admin action (brief §4.3).
 * `before`/`after` are stored so a commission-rule or role change is fully
 * reconstructable. Never updated or deleted.
 */
export async function writeAudit(entry: {
  actorUserId: string | null;
  action: string; // "commission_rule.create", "user.role.update", "kyc.approve"
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}): Promise<void> {
  let ip: string | null = null;
  let userAgent: string | null = null;
  try {
    const h = await headers();
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    userAgent = h.get("user-agent");
  } catch {
    /* outside a request context */
  }

  try {
    const data: AuditLogDoc = {
      actorUserId: entry.actorUserId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      before: (entry.before ?? null) as AuditLogDoc["before"],
      after: (entry.after ?? null) as AuditLogDoc["after"],
      ip,
      userAgent,
      createdAt: nowSentinel(),
    };
    await collection(Collections.auditLogs).add(data);
  } catch (err) {
    // An audit-write failure must be loud but must not swallow the action's
    // own result — surface it in logs / monitoring.
    log.error("audit write failed", { action: entry.action, err: String(err) });
  }
}
