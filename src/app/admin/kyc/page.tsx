import { ShieldCheck } from "lucide-react";
import { ConnectBackend } from "@/components/admin/connect-backend";
import { KycReviewActions } from "@/components/admin/kyc-review-actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { EmptyState } from "@/components/patterns/empty-state";
import { PageHeader } from "@/components/patterns/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminGuardCap } from "@/server/admin/context";
import { Collections, db } from "@/server/firestore";
import type { AppUserDoc, KycProfileDoc, MemberProfileDoc } from "@/server/models";

export const metadata = { title: "ID verification (KYC)" };
export const dynamic = "force-dynamic";

export default async function AdminKycPage() {
  const gate = await adminGuardCap("kyc.review");
  if (gate.preview) return <ConnectBackend missing={gate.missing} />;

  const firestore = db();
  const snap = await firestore
    .collection(Collections.kycProfiles)
    .where("status", "in", ["SUBMITTED", "UNDER_REVIEW"])
    .orderBy("submittedAt", "asc")
    .limit(100)
    .get();
  const kycRows = snap.docs.map((d) => ({ userId: d.id, data: d.data() as KycProfileDoc }));

  const userIds = kycRows.map((r) => r.userId);
  const userSnaps = userIds.length ? await firestore.getAll(...userIds.map((id) => firestore.collection(Collections.appUsers).doc(id))) : [];
  const usersByUid = new Map(userSnaps.filter((s) => s.exists).map((s) => [s.id, s.data() as AppUserDoc]));
  const memberProfileIds = [...usersByUid.values()].map((u) => u.memberProfileId).filter((x): x is string => !!x);
  const memberSnaps = memberProfileIds.length
    ? await firestore.getAll(...memberProfileIds.map((id) => firestore.collection(Collections.memberProfiles).doc(id)))
    : [];
  const membersById = new Map(memberSnaps.filter((s) => s.exists).map((s) => [s.id, s.data() as MemberProfileDoc]));

  const queue = kycRows.map((r) => {
    const user = usersByUid.get(r.userId);
    const member = user?.memberProfileId ? membersById.get(user.memberProfileId) : null;
    return {
      userId: r.userId,
      status: r.data.status,
      aadhaarLast4: r.data.aadhaarLast4,
      panLast4: r.data.panLast4,
      bankAccountLast4: r.data.bankAccountLast4,
      ifsc: r.data.ifsc,
      user: { displayName: user?.displayName ?? null, email: user?.email ?? null, memberProfile: member ? { memberCode: member.memberCode } : null },
    };
  });

  return (
    <>
      <PageHeader
        title="ID verification (KYC)"
        description="Check each distributor's identity and bank details. Approving one also switches their network status to active. Aadhaar/PAN are shown masked; full values are encrypted at rest."
      />

      {queue.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Nothing in the queue">
          New KYC submissions will appear here for review.
        </EmptyState>
      ) : (
        <div className="rounded-xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Aadhaar</TableHead>
                <TableHead>PAN</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Review</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.map((k) => (
                <TableRow key={k.userId}>
                  <TableCell>
                    <div className="font-medium">{k.user.displayName ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {k.user.memberProfile?.memberCode ?? k.user.email}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {k.aadhaarLast4 ? `•••• ${k.aadhaarLast4}` : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {k.panLast4 ? `•••${k.panLast4}` : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {k.bankAccountLast4 ? `•••• ${k.bankAccountLast4} · ${k.ifsc ?? ""}` : "—"}
                  </TableCell>
                  <TableCell><StatusBadge value={k.status} /></TableCell>
                  <TableCell>
                    <KycReviewActions userId={k.userId} />
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
