import { AlertTriangle, ArrowUp, Network, Scale, Search } from "lucide-react";
import Link from "next/link";
import { ConnectBackend } from "@/components/admin/connect-backend";
import { ExportDownlineButton } from "@/components/admin/export-downline-button";
import { GenealogyTree } from "@/components/admin/genealogy-tree";
import { MoveNodeTool } from "@/components/admin/move-node-tool";
import { StatusBadge } from "@/components/admin/status-badge";
import { EmptyState } from "@/components/patterns/empty-state";
import { PageHeader } from "@/components/patterns/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { adminGuardCap } from "@/server/admin/context";
import { findMemberIdForAdmin, getMemberDetail } from "@/server/admin/members";
import { Collections, db } from "@/server/firestore";
import type { AppUserDoc, AuditLogDoc, MemberProfileDoc } from "@/server/models";
import { getBinarySummary, getBinaryTree, MAX_TREE_DEPTH, type LegSummary } from "@/server/network/binary-tree";
import { can } from "@/server/rbac";

export const metadata = { title: "Genealogy tree" };
export const dynamic = "force-dynamic";

const DEFAULT_DEPTH = 3;

const inr = (v: string) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(v));

/** The company's top member: no referrer, not terminated, earliest to join. */
async function findNetworkRootId(): Promise<string | null> {
  const snap = await db().collection(Collections.memberProfiles).where("sponsorId", "==", null).limit(20).get();
  const roots = snap.docs
    .map((d) => ({ id: d.id, data: d.data() as MemberProfileDoc }))
    .filter((r) => !r.data.terminatedAt)
    .sort((a, b) => a.data.joinedAt.toMillis() - b.data.joinedAt.toMillis());
  return roots[0]?.id ?? null;
}

function LegCard({ leg, tone }: { leg: LegSummary; tone: "left" | "right" }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-t-[3px] bg-card p-4",
        tone === "left" ? "border-t-primary" : "border-t-warning",
      )}
    >
      <p className={cn("text-[11px] font-semibold uppercase tracking-wider", tone === "left" ? "text-primary" : "text-warning")}>
        {tone === "left" ? "Left leg" : "Right leg"}
      </p>
      {leg.head ? (
        <Link
          href={`/admin/network?q=${encodeURIComponent(leg.head.memberCode)}`}
          className="mt-1 block truncate text-sm font-medium hover:underline"
        >
          {leg.head.name} <span className="font-mono text-xs font-normal text-muted-foreground">{leg.head.memberCode}</span>
        </Link>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">Open slot — nobody placed here yet</p>
      )}
      <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Members</dt>
          <dd className="text-lg font-semibold tabular-nums">{leg.members}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Active</dt>
          <dd className="text-lg font-semibold tabular-nums">{leg.active}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Business volume (BV)</dt>
          <dd className="text-lg font-semibold tabular-nums">{inr(leg.volume)}</dd>
        </div>
      </dl>
    </div>
  );
}

export default async function AdminNetworkPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; depth?: string }>;
}) {
  const gate = await adminGuardCap("network.view");
  if (gate.preview) return <ConnectBackend missing={gate.missing} />;

  const { q, depth: depthParam } = await searchParams;
  const query = q?.trim() ?? "";
  const depth = Math.min(MAX_TREE_DEPTH, Math.max(2, Number.parseInt(depthParam ?? "", 10) || DEFAULT_DEPTH));
  const canMove = can(gate.user, "network.move");

  // No search yet → show the top of the network, so the page is never a blank box.
  const memberId = query ? await findMemberIdForAdmin(query) : await findNetworkRootId();
  const detail = memberId ? await getMemberDetail(memberId) : null;
  const isBinary = detail?.member.placementStrategy === "BINARY";
  const [tree, summary] =
    detail && isBinary ? await Promise.all([getBinaryTree(detail.member.id, depth), getBinarySummary(detail.member.id)]) : [null, null];

  const firestore = db();
  const movesSnap = await firestore
    .collection(Collections.auditLogs)
    .where("action", "==", "network.move")
    .orderBy("createdAt", "desc")
    .limit(10)
    .get();
  const moveRows = movesSnap.docs.map((d) => ({ id: d.id, data: d.data() as AuditLogDoc }));
  const actorIds = [...new Set(moveRows.map((m) => m.data.actorUserId).filter((x): x is string => !!x))];
  const actorSnaps = actorIds.length ? await firestore.getAll(...actorIds.map((id) => firestore.collection(Collections.appUsers).doc(id))) : [];
  const actorsByUid = new Map(actorSnaps.filter((s) => s.exists).map((s) => [s.id, s.data() as AppUserDoc]));
  const recentMoves = moveRows.map((m) => ({
    id: m.id,
    entityId: m.data.entityId,
    before: m.data.before,
    after: m.data.after,
    createdAt: m.data.createdAt.toDate(),
    actor: m.data.actorUserId ? { email: actorsByUid.get(m.data.actorUserId)?.email ?? null } : null,
  }));

  const depthHref = (d: number) => `/admin/network?${new URLSearchParams({ ...(query ? { q: query } : {}), depth: String(d) })}`;

  return (
    <>
      <PageHeader
        title="Genealogy tree"
        description="The binary team chart. Each distributor has one left and one right slot; extra recruits spill over beneath. Search by referral ID or mobile number to see exactly who sits where."
      />

      <form action="/admin/network" className="mb-6 flex max-w-xl gap-2">
        <Input
          name="q"
          defaultValue={query}
          placeholder="Referral ID (AMA-XXXXXX) or mobile number"
          aria-label="Referral ID or mobile number"
          autoComplete="off"
        />
        <button className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground" type="submit">
          <Search className="h-4 w-4" /> Find
        </button>
      </form>

      {!detail ? (
        query ? (
          <EmptyState icon={Network} title={`No distributor matches “${query}”`}>
            Try their referral ID (like <code className="rounded bg-muted px-1">AMA-7KQ4MT</code>) or the 10-digit mobile number they registered with.
          </EmptyState>
        ) : (
          <EmptyState icon={Network} title="No distributors yet">
            Add the first distributor from <Link href="/admin/members/new" className="text-primary hover:underline">Add distributor</Link> and the tree will start here.
          </EmptyState>
        )
      ) : (
        <div className="space-y-6">
          <Card className="shadow-card">
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="font-serif text-lg font-medium">
                {detail.user.name ?? detail.member.memberCode}
                <span className="ml-2 font-mono text-sm font-normal text-muted-foreground">{detail.member.memberCode}</span>
              </CardTitle>
              <div className="flex items-center gap-3">
                <StatusBadge value={detail.member.status} />
                <ExportDownlineButton memberProfileId={detail.member.id} />
                <Link href={`/admin/members/${detail.member.id}`} className="text-sm text-primary hover:underline">
                  Full profile
                </Link>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Mobile</p>
                <p className="font-mono">{detail.user.phone ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Referred by</p>
                <p className="font-mono">{detail.member.sponsorCode ?? "— (root)"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Placed under</p>
                <p>
                  {detail.member.placementParentCode ? (
                    <>
                      <span className="font-mono">{detail.member.placementParentCode}</span>
                      {detail.member.leg ? <span className="text-muted-foreground"> · {detail.member.leg === "LEFT" ? "left" : "right"} leg</span> : null}
                    </>
                  ) : (
                    "— (top of network)"
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Team / deepest level</p>
                <p className="tabular-nums">
                  {detail.totals.totalDownline} / {detail.totals.deepestLevel}
                </p>
              </div>
            </CardContent>
          </Card>

          {!isBinary ? (
            <Card className="border-warning/50 bg-warning/5 shadow-card">
              <CardContent className="flex gap-3 pt-6 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div className="space-y-1">
                  <p className="font-medium">This network hasn&rsquo;t been converted to the binary plan yet.</p>
                  <p className="text-muted-foreground">
                    The members below still use the old one-level-wide structure, so there is no left/right to draw. Run{" "}
                    <code className="rounded bg-muted px-1">npm run network:migrate-binary</code> then{" "}
                    <code className="rounded bg-muted px-1">npm run network:migrate-binary:apply</code> and reload this page.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {summary ? (
                <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,16rem)_1fr]">
                  <LegCard leg={summary.left} tone="left" />
                  <div className="flex flex-col justify-center rounded-lg border bg-muted/30 p-4 text-center">
                    <Scale className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      {summary.weaker === "EVEN" ? "Both legs level" : `Weaker leg: ${summary.weaker === "LEFT" ? "left" : "right"}`}
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">{inr(summary.payableVolume)}</p>
                    <p className="text-xs text-muted-foreground">commissionable volume</p>
                    <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                      Pay is calculated on the weaker leg only.{" "}
                      {Number(summary.carryVolume) > 0 ? `${inr(summary.carryVolume)} of the stronger leg is waiting for the other side to catch up.` : ""}
                    </p>
                  </div>
                  <LegCard leg={summary.right} tone="right" />
                </div>
              ) : null}

              {tree ? (
                <Card className="shadow-card">
                  <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base font-medium">Team chart</CardTitle>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      {tree.upTo ? (
                        <Link
                          href={`/admin/network?q=${encodeURIComponent(tree.upTo.memberCode)}&depth=${depth}`}
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <ArrowUp className="h-3.5 w-3.5" /> Up to {tree.upTo.name}
                        </Link>
                      ) : null}
                      <div className="inline-flex items-center gap-1 rounded-md border p-0.5" role="group" aria-label="Levels shown">
                        {Array.from({ length: MAX_TREE_DEPTH - 1 }, (_, i) => i + 2).map((d) => (
                          <Link
                            key={d}
                            href={depthHref(d)}
                            aria-current={d === depth ? "true" : undefined}
                            className={cn(
                              "rounded px-2 py-0.5 text-xs",
                              d === depth ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                            )}
                          >
                            {d} levels
                          </Link>
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <GenealogyTree tree={tree} />
                  </CardContent>
                </Card>
              ) : null}

              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="shadow-card">
                  <CardHeader><CardTitle className="text-base font-medium">Upline path</CardTitle></CardHeader>
                  <CardContent>
                    {detail.upline.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Top of the network — no upline.</p>
                    ) : (
                      <ol className="space-y-1 text-sm">
                        {detail.upline.map((u) => (
                          <li key={u.memberCode} className="flex items-center gap-2">
                            <span className="w-6 tabular-nums text-muted-foreground">{u.level}</span>
                            <Link href={`/admin/network?q=${encodeURIComponent(u.memberCode)}`} className="font-mono text-xs text-primary hover:underline">
                              {u.memberCode}
                            </Link>
                            <span className="text-muted-foreground">{u.name ?? ""}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </CardContent>
                </Card>
                <Card className="shadow-card">
                  <CardHeader><CardTitle className="text-base font-medium">Team by level</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow><TableHead>Level</TableHead><TableHead className="text-right">Members</TableHead><TableHead className="text-right">Active</TableHead></TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.levels.length === 0 ? (
                          <TableRow><TableCell colSpan={3} className="text-muted-foreground">No team yet.</TableCell></TableRow>
                        ) : (
                          detail.levels.map((l) => (
                            <TableRow key={l.level}>
                              <TableCell className="tabular-nums">{l.level}</TableCell>
                              <TableCell className="text-right tabular-nums">{l.members}</TableCell>
                              <TableCell className="text-right tabular-nums">{l.active}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              <MoveNodeTool
                member={{ id: detail.member.id, code: detail.member.memberCode, name: detail.user.name }}
                currentParentCode={detail.member.placementParentCode}
                currentLeg={detail.member.leg}
                teamSize={detail.totals.totalDownline}
                canMove={canMove}
              />
            </>
          )}
        </div>
      )}

      <Card className="mt-8 shadow-card">
        <CardHeader><CardTitle className="text-base font-medium">Recent re-placements</CardTitle></CardHeader>
        <CardContent>
          {recentMoves.length === 0 ? (
            <p className="text-sm text-muted-foreground">No manual node moves yet.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {recentMoves.map((m) => {
                // Rows written before the binary plan recorded a sponsor, not a slot.
                type Pos = { parentCode?: string | null; sponsorCode?: string | null; leg?: string | null; subtreeSize?: number };
                const b = (m.before ?? {}) as Pos;
                const a = (m.after ?? {}) as Pos;
                const where = (p: Pos) => {
                  const code = p.parentCode ?? p.sponsorCode ?? "root";
                  return p.leg ? `${code} (${p.leg.toLowerCase()})` : code;
                };
                return (
                  <li key={m.id} className="text-muted-foreground">
                    <span className="text-foreground">{m.actor?.email ?? "admin"}</span> moved{" "}
                    <Link href={`/admin/members/${m.entityId}`} className="font-mono text-xs text-primary hover:underline">
                      {m.entityId?.slice(0, 8)}
                    </Link>{" "}
                    from <span className="font-mono text-xs">{where(b)}</span> to{" "}
                    <span className="font-mono text-xs">{where(a)}</span>{" "}
                    ({a.subtreeSize ?? 1} nodes) · {new Date(m.createdAt).toLocaleString("en-IN")}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
