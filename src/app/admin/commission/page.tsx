import { AlertTriangle } from "lucide-react";
import { CommissionVersionForm } from "@/components/admin/commission-version-form";
import { ConnectBackend } from "@/components/admin/connect-backend";
import { PageHeader } from "@/components/patterns/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminGuardCap } from "@/server/admin/context";
import { Collections, db } from "@/server/firestore";
import type { CommissionRuleSetDoc } from "@/server/models";

export const metadata = { title: "Commission rules" };
export const dynamic = "force-dynamic";

export default async function AdminCommissionPage() {
  const gate = await adminGuardCap("commission.rules.write");
  if (gate.preview) return <ConnectBackend missing={gate.missing} />;

  const firestore = db();
  const [activeSnap, historySnap] = await Promise.all([
    firestore.collection(Collections.commissionRuleSets).where("status", "==", "ACTIVE").orderBy("effectiveFrom", "desc").limit(1).get(),
    firestore.collection(Collections.commissionRuleSets).orderBy("effectiveFrom", "desc").limit(25).get(),
  ]);
  const activeDoc = activeSnap.empty ? null : (activeSnap.docs[0]!.data() as CommissionRuleSetDoc);
  const active = activeDoc
    ? {
        id: activeSnap.docs[0]!.id,
        ...activeDoc,
        effectiveFrom: activeDoc.effectiveFrom.toDate(),
        effectiveTo: activeDoc.effectiveTo?.toDate() ?? null,
        createdAt: activeDoc.createdAt.toDate(),
      }
    : null;
  const history = historySnap.docs.map((d) => {
    const h = d.data() as CommissionRuleSetDoc;
    return {
      id: d.id,
      name: h.name,
      status: h.status,
      effectiveFrom: h.effectiveFrom.toDate(),
      effectiveTo: h.effectiveTo?.toDate() ?? null,
      createdAt: h.createdAt.toDate(),
    };
  });

  const activeJson = active ? JSON.stringify(active.ruleJson, null, 2) : "{}";
  const confirmPending = (active?.confirmPending ?? null) as Record<string, string> | null;

  return (
    <>
      <PageHeader
        title="Commission rules"
        description="The compensation plan is configuration, not code. Every change is a new versioned row with an effective date — historical payouts stay auditable against the version that produced them."
      />

      {confirmPending && Object.keys(confirmPending).length > 0 ? (
        <Card className="mb-6 border-warning/40 bg-warning/5 shadow-card">
          <CardHeader className="flex-row items-center gap-2 pb-3">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <CardTitle className="text-sm font-semibold">Pending founder confirmation</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {Object.entries(confirmPending).map(([k, v]) => (
                <li key={k}>
                  <span className="font-mono text-xs text-foreground">{k}</span>
                  <span className="text-muted-foreground"> — {v}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Repurchase-commission payouts must stay disabled until these are resolved.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mb-6 shadow-card">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="font-serif text-lg font-medium">
            Active version{active ? ` — ${active.name}` : ""}
          </CardTitle>
          {active ? (
            <span className="text-xs text-muted-foreground">
              Effective from {new Date(active.effectiveFrom).toLocaleString("en-IN")}
            </span>
          ) : null}
        </CardHeader>
        <CardContent>
          {active ? (
            <pre className="max-h-[420px] overflow-auto rounded-md border bg-muted/30 p-3 text-xs leading-relaxed">
              {activeJson}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active rule set. Run <code className="rounded bg-muted px-1">npm run db:seed</code>.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="mb-6">
        <CommissionVersionForm currentJson={activeJson} />
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-serif text-base font-medium">Version history</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Effective from</TableHead>
                <TableHead>Effective to</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{h.name}</TableCell>
                  <TableCell className="text-xs">{h.status}</TableCell>
                  <TableCell className="text-xs">{new Date(h.effectiveFrom).toLocaleDateString("en-IN")}</TableCell>
                  <TableCell className="text-xs">
                    {h.effectiveTo ? new Date(h.effectiveTo).toLocaleDateString("en-IN") : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(h.createdAt).toLocaleDateString("en-IN")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
