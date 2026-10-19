import { ArrowLeft, Network } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConnectBackend } from "@/components/admin/connect-backend";
import { MemberCompliancePanel } from "@/components/admin/member-compliance-panel";
import { MemberPhoneField } from "@/components/admin/member-phone-field";
import { MoveNodeTool } from "@/components/admin/move-node-tool";
import { StatusBadge } from "@/components/admin/status-badge";
import { MoneyAmount } from "@/components/patterns/money-amount";
import { PageHeader } from "@/components/patterns/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminGuardCap } from "@/server/admin/context";
import { getMemberDetail } from "@/server/admin/members";
import { getBinarySummary } from "@/server/network/binary-tree";
import { getDistributorDeletability } from "@/server/network/delete";
import { can } from "@/server/rbac";

export const dynamic = "force-dynamic";

export default async function AdminMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const gate = await adminGuardCap("member.view");
  if (gate.preview) return <ConnectBackend missing={gate.missing} />;

  const { id } = await params;
  const data = await getMemberDetail(id);
  if (!data) notFound();

  const { member, user, upline, levels, totals } = data;
  const caps = {
    freeze: can(gate.user, "network.freeze"),
    terminate: can(gate.user, "network.terminate"),
    impersonate: can(gate.user, "member.impersonate"),
    resetPw: can(gate.user, "member.passwordReset"),
    move: can(gate.user, "network.move"),
    delete: can(gate.user, "member.delete"),
    editContact: can(gate.user, "member.edit"),
  };
  const deletability = caps.delete ? await getDistributorDeletability(member.id) : null;
  const legs =
    member.placementStrategy === "BINARY" && !member.terminatedAt ? await getBinarySummary(member.id) : null;
  const inr = (v: string) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(v));

  return (
    <>
      <Link href="/admin/members" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All members
      </Link>
      <PageHeader
        title={user.name ?? member.memberCode}
        description={`${member.memberCode} · joined ${new Date(member.joinedAt).toLocaleDateString("en-IN")}`}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-sm">Account</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Row k="Email" v={user.email ?? "—"} />
            <Row
              k="Phone"
              v={<MemberPhoneField userId={user.id} phone={user.phone} canEdit={caps.editContact} />}
            />
            <Row k="Role" v={user.role} />
            <Row k="Account status" v={<StatusBadge value={user.status} />} />
            <Row k="KYC" v={<StatusBadge value={user.kycStatus} />} />
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-sm">Network position</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Row k="Member status" v={<StatusBadge value={member.status} />} />
            <Row k="Referred by" v={member.sponsorCode ? <Link className="font-mono text-primary hover:underline" href={`/admin/members/${member.sponsorId}`}>{member.sponsorCode}</Link> : "— (root)"} />
            <Row
              k="Placed under"
              v={
                member.placementParentCode && member.placementParentId ? (
                  <span>
                    <Link className="font-mono text-primary hover:underline" href={`/admin/members/${member.placementParentId}`}>{member.placementParentCode}</Link>
                    {member.leg ? <span className="ml-1.5">· {member.leg === "LEFT" ? "Left" : "Right"} leg</span> : null}
                  </span>
                ) : member.placementStrategy === "BINARY" ? "— (root)" : "Not yet converted to binary"
              }
            />
            <Row k="Personally referred" v={String(totals.directReferrals)} />
            <Row k="Frontline filled" v={`${totals.frontline} of 2`} />
            <Row k="Total team" v={String(totals.totalDownline)} />
            <Row k="Deepest level" v={String(totals.deepestLevel)} />
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-sm">Wallet</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Balance</p>
              <MoneyAmount value={user.walletBalance} size="lg" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Withdrawable</p>
              <MoneyAmount value={user.withdrawable} />
            </div>
          </CardContent>
        </Card>
      </div>

      {legs ? (
        <Card className="mt-6 shadow-card">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="font-serif text-base font-medium">Left &amp; right team</CardTitle>
            <Link
              href={`/admin/network?q=${encodeURIComponent(member.memberCode)}`}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Network className="h-3.5 w-3.5" /> View genealogy tree
            </Link>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {[
              { tone: "text-primary", label: "Left leg", leg: legs.left },
              { tone: "text-warning", label: "Right leg", leg: legs.right },
            ].map(({ tone, label, leg }) => (
              <div key={label} className="rounded-lg border p-3">
                <p className={`text-[11px] font-semibold uppercase tracking-wider ${tone}`}>{label}</p>
                <p className="mt-1 truncate">
                  {leg.head ? (
                    <Link href={`/admin/members/${leg.head.id}`} className="hover:underline">
                      {leg.head.name} <span className="font-mono text-xs text-muted-foreground">{leg.head.memberCode}</span>
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">Open slot</span>
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {leg.members} member{leg.members === 1 ? "" : "s"} · {inr(leg.volume)} BV
                </p>
              </div>
            ))}
            <div className="rounded-lg border bg-muted/30 p-3 sm:col-span-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Commissionable volume</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{inr(legs.payableVolume)}</p>
              <p className="text-xs text-muted-foreground">
                {legs.weaker === "EVEN"
                  ? "Both legs are level."
                  : `Paid on the weaker (${legs.weaker === "LEFT" ? "left" : "right"}) leg only.`}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="font-serif text-base font-medium">Upline ({upline.length})</CardTitle></CardHeader>
          <CardContent>
            {upline.length === 0 ? (
              <p className="text-sm text-muted-foreground">Top of the network — no upline.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Lvl</TableHead><TableHead>Member</TableHead><TableHead>Status</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {upline.map((u) => (
                    <TableRow key={u.memberCode}>
                      <TableCell className="tabular-nums">{u.level}</TableCell>
                      <TableCell>
                        <span className="text-sm">{u.name ?? "—"}</span>
                        <span className="ml-1 font-mono text-xs text-muted-foreground">{u.memberCode}</span>
                      </TableCell>
                      <TableCell><StatusBadge value={u.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="font-serif text-base font-medium">Team by level</CardTitle></CardHeader>
          <CardContent>
            {levels.length === 0 ? (
              <p className="text-sm text-muted-foreground">No team yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Level</TableHead><TableHead className="text-right">Members</TableHead><TableHead className="text-right">Active</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {levels.map((l) => (
                    <TableRow key={l.level}>
                      <TableCell className="tabular-nums">{l.level}</TableCell>
                      <TableCell className="text-right tabular-nums">{l.members}</TableCell>
                      <TableCell className="text-right tabular-nums">{l.active}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {(!member.terminatedAt &&
        (caps.move || caps.freeze || caps.terminate || caps.impersonate || caps.resetPw)) ||
      caps.delete ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {caps.move && !member.terminatedAt ? (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-serif text-base font-medium">Re-place in tree</CardTitle>
              </CardHeader>
              <CardContent>
                <MoveNodeTool
                  member={{ id: member.id, code: member.memberCode, name: user.name }}
                  currentParentCode={member.placementParentCode}
                  currentLeg={member.leg}
                  teamSize={totals.totalDownline}
                  canMove
                />
              </CardContent>
            </Card>
          ) : null}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-serif text-base font-medium">Compliance actions</CardTitle>
            </CardHeader>
            <CardContent>
              <MemberCompliancePanel
                memberId={member.id}
                userId={user.id}
                memberCode={member.memberCode}
                frozen={Boolean(member.frozenAt)}
                terminated={Boolean(member.terminatedAt)}
                caps={caps}
                deletability={deletability}
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-medium text-foreground">{v}</span>
    </div>
  );
}
