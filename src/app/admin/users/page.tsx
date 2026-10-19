import { ConnectBackend } from "@/components/admin/connect-backend";
import { RoleControls } from "@/components/admin/role-controls";
import { StatusBadge } from "@/components/admin/status-badge";
import { PageHeader } from "@/components/patterns/page-header";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminGuardCap } from "@/server/admin/context";
import { Collections, db } from "@/server/firestore";
import type { AppUserDoc, MemberProfileDoc } from "@/server/models";

export const metadata = { title: "Users & roles" };
export const dynamic = "force-dynamic";

const SEARCH_SCAN_LIMIT = 1000;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const gate = await adminGuardCap("users.manage");
  if (gate.preview) return <ConnectBackend missing={gate.missing} />;

  const { q } = await searchParams;
  const firestore = db();
  const term = q?.trim().toLowerCase();

  let rows: { id: string; data: AppUserDoc }[];
  if (term) {
    const snap = await firestore.collection(Collections.appUsers).limit(SEARCH_SCAN_LIMIT).get();
    rows = snap.docs
      .map((d) => ({ id: d.id, data: d.data() as AppUserDoc }))
      .filter((r) => r.data.email?.toLowerCase().includes(term) || r.data.displayName?.toLowerCase().includes(term));
  } else {
    const snap = await firestore.collection(Collections.appUsers).orderBy("createdAt", "desc").limit(100).get();
    rows = snap.docs.map((d) => ({ id: d.id, data: d.data() as AppUserDoc }));
  }
  rows.sort((a, b) => a.data.role.localeCompare(b.data.role) || b.data.createdAt.toMillis() - a.data.createdAt.toMillis());
  rows = rows.slice(0, 100);

  const memberProfileIds = rows.map((r) => r.data.memberProfileId).filter((x): x is string => !!x);
  const memberSnaps = memberProfileIds.length
    ? await firestore.getAll(...memberProfileIds.map((id) => firestore.collection(Collections.memberProfiles).doc(id)))
    : [];
  const membersById = new Map(memberSnaps.filter((s) => s.exists).map((s) => [s.id, s.data() as MemberProfileDoc]));

  const users = rows.map((r) => ({
    id: r.id,
    email: r.data.email,
    displayName: r.data.displayName,
    role: r.data.role,
    status: r.data.status,
    memberProfile: r.data.memberProfileId ? { memberCode: membersById.get(r.data.memberProfileId)?.memberCode ?? null } : null,
  }));

  return (
    <>
      <PageHeader
        title="Users & roles"
        description="Grant or revoke console access and suspend accounts. Role changes take effect on the user's next request and are logged."
      />

      <form className="mb-4 max-w-sm" action="/admin/users">
        <Input name="q" defaultValue={q ?? ""} placeholder="Search name or email…" aria-label="Search users" />
      </form>

      <div className="rounded-xl border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Member code</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Role &amp; access</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="font-medium">{u.displayName ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{u.email ?? u.id}</div>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {u.memberProfile?.memberCode ?? "—"}
                </TableCell>
                <TableCell><StatusBadge value={u.status} /></TableCell>
                <TableCell>
                  <RoleControls
                    userId={u.id}
                    role={u.role}
                    status={u.status}
                    isSelf={u.id === gate.user.uid}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
