import "server-only";
import { Collections, db } from "@/server/firestore";
import type { AppUserDoc, MemberApplicationDoc, MemberProfileDoc, NetworkClosureDoc } from "@/server/models";
import { env } from "@/server/env";

/**
 * The "Referrers" view: every distributor who has actually brought people in —
 * through the public `/join` funnel, an admin enrolment, or organic downline —
 * with the follow-up-worthy number (pending leads) up front and their
 * ready-to-share referral link. It's the recruitment-activity lens on the same
 * data the Distributors roster lists.
 *
 * "Direct" means people they PERSONALLY REFERRED (`sponsorId`), not the members
 * sitting directly beneath them in the binary tree — with spillover those are
 * different people. "Team" is their whole binary team (both legs).
 *
 * Firestore has no `groupBy`/relation-count aggregation, so this scans
 * `member_profiles` (sponsor + join date only) and `member_applications` once and
 * aggregates in memory — fine at today's scale; revisit with denormalized
 * counters if the network grows large.
 */

export interface ReferrerRow {
  id: string;
  memberCode: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  directCount: number;
  teamCount: number;
  pendingLeads: number;
  approvedViaFunnel: number;
  totalLeads: number;
  lastActivityAt: string | null;
  referralLink: string;
}

export interface ReferrerStats {
  activeReferrers: number;
  pendingLeads: number;
  leadsThisMonth: number;
  approvalRate: number | null;
}

const PENDING_STATUSES = new Set(["PENDING", "ON_HOLD"]);

async function directReferralCounts(): Promise<Map<string, { count: number; lastJoinedAt: Date | null }>> {
  const snap = await db().collection(Collections.memberProfiles).select("sponsorId", "joinedAt").get();
  const bySponsor = new Map<string, { count: number; lastJoinedAt: Date | null }>();
  for (const d of snap.docs) {
    const sponsorId = d.get("sponsorId") as string | null;
    if (!sponsorId) continue;
    const cur = bySponsor.get(sponsorId) ?? { count: 0, lastJoinedAt: null };
    cur.count += 1;
    const joined = (d.get("joinedAt") as MemberProfileDoc["joinedAt"]).toDate();
    if (!cur.lastJoinedAt || joined > cur.lastJoinedAt) cur.lastJoinedAt = joined;
    bySponsor.set(sponsorId, cur);
  }
  return bySponsor;
}

async function teamCounts(ancestorIds: string[]): Promise<Map<string, number>> {
  const byAncestor = new Map<string, number>();
  for (let i = 0; i < ancestorIds.length; i += 30) {
    const chunk = ancestorIds.slice(i, i + 30);
    if (!chunk.length) continue;
    const snap = await db().collection(Collections.networkClosure).where("ancestorId", "in", chunk).where("depth", ">=", 1).get();
    for (const d of snap.docs) {
      const e = d.data() as NetworkClosureDoc;
      byAncestor.set(e.ancestorId, (byAncestor.get(e.ancestorId) ?? 0) + 1);
    }
  }
  return byAncestor;
}

async function applicationsBySponsor(): Promise<
  Map<string, { pending: number; approved: number; total: number; lastAt: Date | null }>
> {
  const snap = await db().collection(Collections.memberApplications).get();
  const bySponsor = new Map<string, { pending: number; approved: number; total: number; lastAt: Date | null }>();
  for (const d of snap.docs) {
    const a = d.data() as MemberApplicationDoc;
    if (!a.sponsorId) continue;
    const cur = bySponsor.get(a.sponsorId) ?? { pending: 0, approved: 0, total: 0, lastAt: null };
    cur.total += 1;
    if (PENDING_STATUSES.has(a.status)) cur.pending += 1;
    if (a.status === "APPROVED") cur.approved += 1;
    const createdAt = a.createdAt.toDate();
    if (!cur.lastAt || createdAt > cur.lastAt) cur.lastAt = createdAt;
    bySponsor.set(a.sponsorId, cur);
  }
  return bySponsor;
}

export async function listReferrers(
  opts: { q?: string; onlyPending?: boolean; sort?: "direct" | "recent"; skip?: number; take?: number } = {},
) {
  const take = Math.min(opts.take ?? 30, 100);
  const skip = opts.skip ?? 0;
  const q = opts.q?.trim().toLowerCase();
  const firestore = db();

  const [directCounts, appsBySponsor] = await Promise.all([directReferralCounts(), applicationsBySponsor()]);

  const referrerIds = new Set<string>([...directCounts.keys(), ...appsBySponsor.keys()]);
  let candidateIds = [...referrerIds];

  if (opts.onlyPending) {
    candidateIds = candidateIds.filter((id) => (appsBySponsor.get(id)?.pending ?? 0) > 0);
  }

  const profileSnaps = candidateIds.length
    ? await firestore.getAll(...candidateIds.map((id) => firestore.collection(Collections.memberProfiles).doc(id)))
    : [];
  let profiles = profileSnaps
    .filter((s) => s.exists)
    .map((s) => ({ id: s.id, data: s.data() as MemberProfileDoc }));

  const userIds = [...new Set(profiles.map((p) => p.data.userId))];
  const userSnaps = userIds.length ? await firestore.getAll(...userIds.map((id) => firestore.collection(Collections.appUsers).doc(id))) : [];
  const usersByUid = new Map(userSnaps.filter((s) => s.exists).map((s) => [s.id, s.data() as AppUserDoc]));

  if (q) {
    profiles = profiles.filter((p) => {
      const u = usersByUid.get(p.data.userId);
      return (
        p.data.memberCode.toLowerCase().includes(q) ||
        u?.email?.toLowerCase().includes(q) ||
        u?.displayName?.toLowerCase().includes(q) ||
        u?.phone?.includes(q)
      );
    });
  }

  const total = profiles.length;
  const teamById = await teamCounts(profiles.map((p) => p.id));

  profiles.sort((a, b) =>
    opts.sort === "recent"
      ? b.data.joinedAt.toMillis() - a.data.joinedAt.toMillis()
      : (directCounts.get(b.id)?.count ?? 0) - (directCounts.get(a.id)?.count ?? 0),
  );
  const page = profiles.slice(skip, skip + take);

  const base = env.siteUrl.replace(/\/$/, "");
  const list: ReferrerRow[] = page.map((p) => {
    const user = usersByUid.get(p.data.userId);
    const direct = directCounts.get(p.id);
    const apps = appsBySponsor.get(p.id);
    const lastDirect = direct?.lastJoinedAt ?? null;
    const lastLead = apps?.lastAt ?? null;
    const lastActivity = lastDirect && lastLead ? (lastDirect > lastLead ? lastDirect : lastLead) : (lastDirect ?? lastLead);

    return {
      id: p.id,
      memberCode: p.data.memberCode,
      name: user?.displayName ?? "—",
      email: user?.email ?? null,
      phone: user?.phone ?? null,
      status: p.data.status,
      directCount: direct?.count ?? 0,
      teamCount: teamById.get(p.id) ?? 0,
      pendingLeads: apps?.pending ?? 0,
      approvedViaFunnel: apps?.approved ?? 0,
      totalLeads: apps?.total ?? 0,
      lastActivityAt: lastActivity ? lastActivity.toISOString() : null,
      referralLink: `${base}/join?ref=${p.data.memberCode}`,
    };
  });

  return { list, total, take };
}

export async function referrerStats(): Promise<ReferrerStats> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [directCounts, appsSnap, leadsThisMonthSnap] = await Promise.all([
    directReferralCounts(),
    db().collection(Collections.memberApplications).get(),
    db().collection(Collections.memberApplications).where("createdAt", ">=", startOfMonth).count().get(),
  ]);

  let approved = 0;
  let rejected = 0;
  let pending = 0;
  for (const d of appsSnap.docs) {
    const a = d.data() as MemberApplicationDoc;
    if (a.status === "APPROVED") approved += 1;
    else if (a.status === "REJECTED") rejected += 1;
    else if (PENDING_STATUSES.has(a.status)) pending += 1;
  }
  const decided = approved + rejected;

  return {
    activeReferrers: directCounts.size,
    pendingLeads: pending,
    leadsThisMonth: leadsThisMonthSnap.data().count,
    approvalRate: decided ? Math.round((approved / decided) * 100) : null,
  };
}
