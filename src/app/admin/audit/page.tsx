import { ConnectBackend } from "@/components/admin/connect-backend";
import { EmptyState } from "@/components/patterns/empty-state";
import { PageHeader } from "@/components/patterns/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminGuardCap } from "@/server/admin/context";
import { Collections, collection, doc, db as firestoreDb } from "@/server/firestore";
import type { AppUserDoc, AuditLogDoc, WithId } from "@/server/models";
import { withId } from "@/server/models";
import { FileClock } from "lucide-react";

export const metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const gate = await adminGuardCap("audit.view");
  if (gate.preview) return <ConnectBackend missing={gate.missing} />;

  const snap = await collection(Collections.auditLogs).orderBy("createdAt", "desc").limit(200).get();
  const rows: WithId<AuditLogDoc>[] = snap.docs.map((d) => withId(d.id, d.data() as AuditLogDoc));

  const actorIds = [...new Set(rows.map((r) => r.actorUserId).filter((x): x is string => !!x))];
  const actorSnaps = actorIds.length ? await firestoreDb().getAll(...actorIds.map((id) => doc(Collections.appUsers, id))) : [];
  const actorsByUid = new Map(actorSnaps.filter((s) => s.exists).map((s) => [s.id, s.data() as AppUserDoc]));

  const logs = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toDate(),
    actor: r.actorUserId ? (actorsByUid.get(r.actorUserId) ?? null) : null,
  }));

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every mutating admin action, append-only. Before/after values are recorded for role and commission-rule changes."
      />

      {logs.length === 0 ? (
        <EmptyState icon={FileClock} title="No actions logged yet">
          Admin mutations (role changes, KYC decisions, rule versions) show up here.
        </EmptyState>
      ) : (
        <div className="rounded-xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(l.createdAt).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-xs">
                    {l.actor?.email ?? l.actor?.displayName ?? "system"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{l.action}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {l.entity}
                    {l.entityId ? `:${l.entityId.slice(0, 8)}` : ""}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <code className="block truncate text-[11px] text-muted-foreground">
                      {JSON.stringify(l.before ?? {})} → {JSON.stringify(l.after ?? {})}
                    </code>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
