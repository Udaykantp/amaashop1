import { Plus, UserPlus } from "lucide-react";
import Link from "next/link";
import type { MemberApplicationStatus } from "@/server/enums";
import {
  ApplicationSourceBadge,
  ApplicationStatus,
} from "@/components/admin/application-status";
import { ConnectBackend } from "@/components/admin/connect-backend";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/patterns/empty-state";
import { PageHeader } from "@/components/patterns/page-header";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatRelativeTime } from "@/lib/member/time";
import { adminGuardCap } from "@/server/admin/context";
import { applicationStats, listApplications } from "@/server/admin/applications";
import { can } from "@/server/rbac";
import { cn } from "@/lib/utils";

export const metadata = { title: "Registrations" };
export const dynamic = "force-dynamic";

const STATUSES: MemberApplicationStatus[] = ["PENDING", "ON_HOLD", "APPROVED", "REJECTED"];

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const gate = await adminGuardCap("application.review");
  if (gate.preview) return <ConnectBackend missing={gate.missing} />;

  const { q, status, page } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);
  const statusFilter = STATUSES.includes(status as MemberApplicationStatus)
    ? (status as MemberApplicationStatus)
    : undefined;

  const [{ list, total, take }, stats] = await Promise.all([
    listApplications({ q, status: statusFilter, skip: (pageNum - 1) * 30 }),
    applicationStats(),
  ]);
  const pages = Math.max(1, Math.ceil(total / take));
  const canEnroll = can(gate.user, "member.create");

  const tab = (label: string, value?: string) => {
    const active = (value ?? "") === (statusFilter ?? "");
    const params = new URLSearchParams({ ...(q ? { q } : {}), ...(value ? { status: value } : {}) });
    return (
      <Link
        key={label}
        href={`/admin/applications${params.toString() ? `?${params}` : ""}`}
        className={cn(
          "rounded-md px-3 py-1.5 text-sm font-medium",
          active ? "bg-primary text-primary-foreground" : "border hover:bg-secondary",
        )}
      >
        {label}
      </Link>
    );
  };

  return (
    <>
      <PageHeader
        title="Distributor registrations"
        description="Every distributor onboarding — the public /join form and admin-entered enrollments — in one queue."
        action={
          canEnroll ? (
            <Link href="/admin/members/new">
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> Enroll distributor
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            { label: "Pending", value: stats.pending, tone: "text-warning" },
            { label: "On hold", value: stats.onHold, tone: "text-muted-foreground" },
            { label: "Approved", value: stats.approved, tone: "text-success" },
            { label: "Rejected", value: stats.rejected, tone: "text-destructive" },
          ] as const
        ).map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4 shadow-card">
            <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
            <p className={cn("mt-1 text-2xl font-semibold tabular-nums", s.tone)}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tab("All")}
        {tab("Pending", "PENDING")}
        {tab("On hold", "ON_HOLD")}
        {tab("Approved", "APPROVED")}
        {tab("Rejected", "REJECTED")}
      </div>

      <form className="mb-4 max-w-sm" action="/admin/applications">
        {statusFilter ? <input type="hidden" name="status" value={statusFilter} /> : null}
        <Input name="q" defaultValue={q ?? ""} placeholder="Name, mobile, or referrer…" aria-label="Search applications" />
      </form>

      {list.length === 0 ? (
        <EmptyState icon={UserPlus} title={q || statusFilter ? "No applications match" : "No applications yet"}>
          {q || statusFilter
            ? "Try a different search or status."
            : "Registrations from the /join page appear here for review."}
        </EmptyState>
      ) : (
        <div className="rounded-xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Referrer</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Link href={`/admin/applications/${a.id}`} className="font-medium text-primary hover:underline">
                      {a.fullName}
                    </Link>
                    <div className="text-xs text-muted-foreground">{a.email ?? "—"}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{a.phone}</TableCell>
                  <TableCell className="text-xs">
                    <span className="font-mono">{a.sponsorCode ?? a.referrerInput}</span>
                    {a.sponsorName ? (
                      <div className="text-muted-foreground">{a.sponsorName}</div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {a.city}, {a.state}
                  </TableCell>
                  <TableCell>
                    <ApplicationSourceBadge value={a.source} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatRelativeTime(a.createdAt)}
                  </TableCell>
                  <TableCell>
                    <ApplicationStatus value={a.status} />
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
            Page {pageNum} of {pages}
          </span>
          <div className="flex gap-2">
            {pageNum > 1 ? (
              <Link
                className="rounded-md border px-3 py-1.5 hover:bg-secondary"
                href={`/admin/applications?${new URLSearchParams({ ...(q ? { q } : {}), ...(statusFilter ? { status: statusFilter } : {}), page: String(pageNum - 1) })}`}
              >
                Previous
              </Link>
            ) : null}
            {pageNum < pages ? (
              <Link
                className="rounded-md border px-3 py-1.5 hover:bg-secondary"
                href={`/admin/applications?${new URLSearchParams({ ...(q ? { q } : {}), ...(statusFilter ? { status: statusFilter } : {}), page: String(pageNum + 1) })}`}
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
