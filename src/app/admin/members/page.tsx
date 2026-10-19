import Link from "next/link";
import { ConnectBackend } from "@/components/admin/connect-backend";
import { MemberRowActions } from "@/components/admin/member-row-actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/patterns/empty-state";
import { PageHeader } from "@/components/patterns/page-header";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatRelativeTime } from "@/lib/member/time";
import { adminGuardCap } from "@/server/admin/context";
import { listMembers } from "@/server/admin/members";
import { can } from "@/server/rbac";
import { Plus, Users } from "lucide-react";

export const metadata = { title: "Distributors" };
export const dynamic = "force-dynamic";

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const gate = await adminGuardCap("member.view");
  if (gate.preview) return <ConnectBackend missing={gate.missing} />;

  const { q, page } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);
  const { list, total, take } = await listMembers({ q, skip: (pageNum - 1) * 30 });
  const pages = Math.max(1, Math.ceil(total / take));
  const canDelete = can(gate.user, "member.delete");

  return (
    <>
      <PageHeader
        title="Distributors"
        description={`${total} distributor${total === 1 ? "" : "s"} in the network. Open one to see their left and right team, verify KYC, freeze, or remove them.`}
        action={
          can(gate.user, "member.create") ? (
            <Link href="/admin/members/new">
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> Add distributor
              </Button>
            </Link>
          ) : undefined
        }
      />

      <form className="mb-4 max-w-sm" action="/admin/members">
        <Input name="q" defaultValue={q ?? ""} placeholder="Search name, mobile, email, or AMA-code…" aria-label="Search distributors" />
      </form>

      {list.length === 0 ? (
        <EmptyState icon={Users} title={q ? "No members match that search" : "No members yet"}>
          {q ? "Try a different name or code." : "Members appear here as people join the network."}
        </EmptyState>
      ) : (
        <div className="rounded-xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Referred by</TableHead>
                <TableHead>Placed under</TableHead>
                <TableHead className="text-right">Team L · R</TableHead>
                <TableHead className="text-right">Referred</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>KYC</TableHead>
                <TableHead>Joined</TableHead>
                {canDelete ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <Link href={`/admin/members/${m.id}`} className="font-medium text-primary hover:underline">
                      {m.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">{m.email ?? "—"}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{m.memberCode}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{m.sponsorCode ?? "—"}</TableCell>
                  <TableCell className="text-xs">
                    {!m.binary ? (
                      <span className="text-muted-foreground" title="Run the binary conversion to place this distributor">Not converted</span>
                    ) : m.placedUnderCode && m.leg ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Link href={`/admin/network?q=${m.placedUnderCode}`} className="font-mono text-muted-foreground hover:underline">
                          {m.placedUnderCode}
                        </Link>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                            m.leg === "LEFT" ? "bg-primary/10 text-primary" : "bg-warning/15 text-warning"
                          }`}
                        >
                          {m.leg === "LEFT" ? "Left" : "Right"}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Top of network</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">
                    <span className="text-primary">{m.leftCount}</span>
                    <span className="mx-1 text-muted-foreground">·</span>
                    <span className="text-warning">{m.rightCount}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{m.directCount}</TableCell>
                  <TableCell><StatusBadge value={m.status} /></TableCell>
                  <TableCell><StatusBadge value={m.kycStatus} /></TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatRelativeTime(m.joinedAt)}
                  </TableCell>
                  {canDelete ? (
                    <TableCell className="text-right">
                      <MemberRowActions
                        memberId={m.id}
                        memberCode={m.memberCode}
                        name={m.name}
                        directCount={m.directCount}
                      />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {pages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Page {pageNum} of {pages}</span>
          <div className="flex gap-2">
            {pageNum > 1 ? (
              <Link className="rounded-md border px-3 py-1.5 hover:bg-secondary" href={`/admin/members?${new URLSearchParams({ ...(q ? { q } : {}), page: String(pageNum - 1) })}`}>
                Previous
              </Link>
            ) : null}
            {pageNum < pages ? (
              <Link className="rounded-md border px-3 py-1.5 hover:bg-secondary" href={`/admin/members?${new URLSearchParams({ ...(q ? { q } : {}), page: String(pageNum + 1) })}`}>
                Next
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
