import { Share2, Users } from "lucide-react";
import Link from "next/link";
import { ConnectBackend } from "@/components/admin/connect-backend";
import { CopyLinkButton } from "@/components/admin/copy-link-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { EmptyState } from "@/components/patterns/empty-state";
import { PageHeader } from "@/components/patterns/page-header";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatRelativeTime } from "@/lib/member/time";
import { adminGuardCap } from "@/server/admin/context";
import { listReferrers, referrerStats } from "@/server/admin/referrers";
import { cn } from "@/lib/utils";

export const metadata = { title: "Referrers" };
export const dynamic = "force-dynamic";

export default async function AdminReferrersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; sort?: string; page?: string }>;
}) {
  const gate = await adminGuardCap("member.view");
  if (gate.preview) return <ConnectBackend missing={gate.missing} />;

  const { q, filter, sort, page } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);
  const onlyPending = filter === "pending";
  const sortKey = sort === "recent" ? "recent" : "direct";

  const [{ list, total, take }, stats] = await Promise.all([
    listReferrers({ q, onlyPending, sort: sortKey, skip: (pageNum - 1) * 30 }),
    referrerStats(),
  ]);
  const pages = Math.max(1, Math.ceil(total / take));

  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q, filter, sort, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return `/admin/referrers${s ? `?${s}` : ""}`;
  };

  const pill = (label: string, href: string, active: boolean) => (
    <Link
      href={href}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium",
        active ? "bg-primary text-primary-foreground" : "border hover:bg-secondary",
      )}
    >
      {label}
    </Link>
  );

  return (
    <>
      <PageHeader
        title="Referrers"
        description="Distributors who are bringing people in — their pending leads, downline, and referral link."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            { label: "Active referrers", value: stats.activeReferrers },
            { label: "Pending leads", value: stats.pendingLeads, tone: "text-warning" },
            { label: "Leads this month", value: stats.leadsThisMonth },
            {
              label: "Approval rate",
              value: stats.approvalRate === null ? "—" : `${stats.approvalRate}%`,
            },
          ] as const
        ).map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4 shadow-card">
            <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
            <p
              className={cn(
                "mt-1 text-2xl font-semibold tabular-nums",
                "tone" in s ? s.tone : undefined,
              )}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {pill("All referrers", qs({ filter: undefined, page: undefined }), !onlyPending)}
        {pill("Needs follow-up", qs({ filter: "pending", page: undefined }), onlyPending)}
        <span className="mx-1 h-4 w-px bg-border" />
        <span className="text-xs text-muted-foreground">Sort</span>
        {pill("Most referred", qs({ sort: undefined, page: undefined }), sortKey === "direct")}
        {pill("Newest", qs({ sort: "recent", page: undefined }), sortKey === "recent")}
      </div>

      <form className="mb-4 max-w-sm" action="/admin/referrers">
        {onlyPending ? <input type="hidden" name="filter" value="pending" /> : null}
        {sortKey === "recent" ? <input type="hidden" name="sort" value="recent" /> : null}
        <Input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Name, mobile, or AMA code…"
          aria-label="Search referrers"
        />
      </form>

      {list.length === 0 ? (
        <EmptyState
          icon={onlyPending ? Users : Share2}
          title={q || onlyPending ? "No referrers match" : "No referrers yet"}
        >
          {q || onlyPending
            ? "Try a different search or clear the filter."
            : "Distributors appear here once they refer their first person."}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referrer</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead className="text-right">Referred</TableHead>
                <TableHead className="text-right">Team</TableHead>
                <TableHead className="text-right">Pending leads</TableHead>
                <TableHead className="text-right">Approved</TableHead>
                <TableHead>Last activity</TableHead>
                <TableHead className="text-right">Referral link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link
                      href={`/admin/members/${r.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {r.name}
                    </Link>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="font-mono">{r.memberCode}</span>
                      <StatusBadge value={r.status} />
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.phone ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.directCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.teamCount}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.pendingLeads > 0 ? (
                      <Link
                        href={`/admin/applications?status=PENDING&q=${encodeURIComponent(r.memberCode)}`}
                        className="inline-flex items-center rounded bg-warning/10 px-1.5 py-0.5 font-medium text-warning hover:underline"
                      >
                        {r.pendingLeads}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {r.approvedViaFunnel}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {r.lastActivityAt ? formatRelativeTime(r.lastActivityAt) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <CopyLinkButton value={r.referralLink} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {pages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {pageNum} of {pages} · {total} referrer{total === 1 ? "" : "s"}
          </span>
          <div className="flex gap-2">
            {pageNum > 1 ? (
              <Link
                className="rounded-md border px-3 py-1.5 hover:bg-secondary"
                href={qs({ page: String(pageNum - 1) })}
              >
                Previous
              </Link>
            ) : null}
            {pageNum < pages ? (
              <Link
                className="rounded-md border px-3 py-1.5 hover:bg-secondary"
                href={qs({ page: String(pageNum + 1) })}
              >
                Next
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
