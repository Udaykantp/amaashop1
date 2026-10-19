import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { Collections, db, doc, nowSentinel, serverTimestamp, uniqueLockRef } from "@/server/firestore";
import type { AppUserDoc, KycProfileDoc, MemberProfileDoc, NetworkClosureDoc } from "@/server/models";
import { log } from "@/server/log";
import { generateMemberCode } from "@/server/network/member-code";
import { getPlacementStrategy, type LegPreference, type Tx } from "@/server/network/placement";
import type { BinaryLeg } from "@/server/enums";

export const MAX_COMMISSION_DEPTH = 20; // Level 1..20 upline; Level 0 = direct sponsor

export class NetworkError extends Error {
  constructor(
    message: string,
    readonly code:
      | "ALREADY_MEMBER"
      | "SPONSOR_NOT_FOUND"
      | "SELF_SPONSOR"
      | "REFERRAL_LOOP"
      | "CODE_COLLISION"
      | "NOT_FOUND"
      | "DELETE_BLOCKED"
      | "NEEDS_MIGRATION",
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Join
// ─────────────────────────────────────────────────────────────────────────────

export interface JoinNetworkInput {
  userId: string;
  /** Sponsor's member code. Null only for the very first (root) member. */
  sponsorCode: string | null;
  /** Which leg of the sponsor to grow. Defaults to "AUTO" (feed the weaker leg). */
  preferredLeg?: LegPreference;
  joiningOrderId?: string;
}

export interface JoinNetworkResult {
  memberProfileId: string;
  memberCode: string;
  sponsorId: string | null;
  /** Binary tree parent — differs from the sponsor when the member spilled over. */
  placementParentId: string | null;
  leg: BinaryLeg | null;
  depthFromRoot: number;
}

/**
 * Register `userId` as a network member under `sponsorCode`, in one Firestore
 * transaction:
 *   1. guard against double-join, self-sponsor, and referral loops
 *   2. allocate a unique memberCode (checked via the `unique_index` lock —
 *      see `runUniqueTransaction` in `@/server/firestore` for the pattern;
 *      inlined here because the lock must be claimed alongside the rest of
 *      this transaction's writes, not as its own)
 *   3. run the binary placement to find the genealogy parent + leg (spillover
 *      when the sponsor's chosen slot is taken)
 *   4. materialise the closure-table rows in one batch of writes
 *   5. upgrade the AppUser role CONSUMER -> MEMBER, cache memberProfileId
 *
 * Firestore transactions require every read to happen before any write, so
 * this function is structured in two strict phases — unlike the old Prisma
 * version, which could interleave them.
 */
export async function joinNetwork(input: JoinNetworkInput): Promise<JoinNetworkResult> {
  const result = await withContentionRetry(() => joinNetworkOnce(input));
  log.info("member joined network", {
    userId: input.userId,
    memberProfileId: result.memberProfileId,
    sponsorId: result.sponsorId,
    placementParentId: result.placementParentId,
    leg: result.leg,
    depthFromRoot: result.depthFromRoot,
  });
  return result;
}

/**
 * Finding a vacant slot reads a good part of the sponsor's leg, so simultaneous
 * joins under the same sponsor contend for the same documents and Firestore may
 * abort some with a lock timeout (gRPC ABORTED, code 10). Nothing was written
 * when that happens, so just try again after a short jittered pause.
 */
async function withContentionRetry<T>(fn: () => Promise<T>, attempts = 6): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const aborted = (err as { code?: number } | null)?.code === 10;
      if (!aborted || attempt >= attempts) throw err;
      await new Promise((r) => setTimeout(r, 80 * 2 ** attempt * (0.5 + Math.random())));
    }
  }
}

async function joinNetworkOnce(input: JoinNetworkInput): Promise<JoinNetworkResult> {
  const { userId, sponsorCode, joiningOrderId, preferredLeg } = input;
  const firestore = db();

  return firestore.runTransaction(async (tx) => {
    // ── phase 1: reads ──────────────────────────────────────────────────
    const existingSnap = await tx.get(
      firestore.collection(Collections.memberProfiles).where("userId", "==", userId).limit(1),
    );
    if (!existingSnap.empty) throw new NetworkError("You are already a network member.", "ALREADY_MEMBER");

    let sponsor: { id: string; userId: string } | null = null;
    if (sponsorCode) {
      const sponsorSnap = await tx.get(
        firestore.collection(Collections.memberProfiles).where("memberCode", "==", sponsorCode).limit(1),
      );
      if (sponsorSnap.empty) throw new NetworkError("That referral code doesn't exist.", "SPONSOR_NOT_FOUND");
      const sDoc = sponsorSnap.docs[0]!;
      const sData = sDoc.data() as MemberProfileDoc;
      if (sData.userId === userId) throw new NetworkError("You can't refer yourself.", "SELF_SPONSOR");
      if (sData.placementStrategy !== "BINARY") {
        throw new NetworkError(
          "The network hasn't been converted to the binary plan yet. Run `npm run network:migrate-binary:apply` (plain `npm run network:migrate-binary` is only a dry run and changes nothing).",
          "NEEDS_MIGRATION",
        );
      }
      sponsor = { id: sDoc.id, userId: sData.userId };
    } else {
      const countSnap = await tx.get(firestore.collection(Collections.memberProfiles).count());
      if (countSnap.data().count > 0) {
        throw new NetworkError("A referral code is required to join.", "SPONSOR_NOT_FOUND");
      }
    }

    // Allocate a free member code — read-only lock checks, no writes yet.
    // ~29 bits of entropy over 6 chars makes a clash astronomically unlikely;
    // this loop plus the lock claimed below is still the hard guarantee.
    let memberCode: string | null = null;
    let codeLockRef: FirebaseFirestore.DocumentReference | null = null;
    for (let attempt = 0; attempt < 12 && !memberCode; attempt++) {
      const candidate = generateMemberCode();
      const ref = uniqueLockRef("memberCode", candidate);
      const snap = await tx.get(ref);
      if (!snap.exists) {
        memberCode = candidate;
        codeLockRef = ref;
      } else {
        log.warn("member code candidate already taken, regenerating", { code: candidate });
      }
    }
    if (!memberCode || !codeLockRef) {
      throw new NetworkError("Could not allocate a unique member code.", "CODE_COLLISION");
    }

    let parentId: string | null = null;
    let leg: BinaryLeg | null = null;
    let parentAncestorEdges: { ancestorId: string; depth: number }[] = [];
    if (sponsor) {
      const placement = await getPlacementStrategy("BINARY").place(tx as Tx, {
        sponsorId: sponsor.id,
        preferredLeg,
      });
      parentId = placement.parentId;
      leg = placement.leg;

      const ancestorsSnap = await tx.get(
        firestore.collection(Collections.networkClosure).where("descendantId", "==", parentId),
      );
      parentAncestorEdges = ancestorsSnap.docs.map((d) => {
        const data = d.data() as NetworkClosureDoc;
        return { ancestorId: data.ancestorId, depth: data.depth };
      });
    }

    // ── phase 2: writes ─────────────────────────────────────────────────
    const newProfileRef = firestore.collection(Collections.memberProfiles).doc();
    const profileId = newProfileRef.id;
    const now = Timestamp.now();

    const profileData: MemberProfileDoc = {
      userId,
      memberCode,
      sponsorId: sponsor?.id ?? null,
      placementParentId: parentId,
      leg,
      placementStrategy: "BINARY",
      status: "PENDING_KYC",
      joinedAt: now,
      joiningOrderId: joiningOrderId ?? null,
      frozenAt: null,
      frozenReason: null,
      terminatedAt: null,
      compressedIntoId: null,
      lastMovedAt: null,
      lastMovedFromId: null,
    };
    tx.set(newProfileRef, profileData);
    tx.set(codeLockRef, { field: "memberCode", value: memberCode, createdAt: serverTimestamp() });

    // loop guard: the chosen parent must not sit *below* the new member.
    // (It can't yet — the new member has no descendants — but this keeps the
    //  invariant explicit.)
    if (parentId === profileId) {
      throw new NetworkError("Invalid placement (referral loop).", "REFERRAL_LOOP");
    }

    const closureRows: NetworkClosureDoc[] = [
      { ancestorId: profileId, descendantId: profileId, depth: 0, descendantJoinedAt: now },
    ];
    for (const edge of parentAncestorEdges) {
      closureRows.push({
        ancestorId: edge.ancestorId,
        descendantId: profileId,
        depth: edge.depth + 1,
        descendantJoinedAt: now,
      });
    }
    for (const row of closureRows) {
      tx.set(firestore.collection(Collections.networkClosure).doc(`${row.ancestorId}_${row.descendantId}`), row);
    }

    tx.update(doc(Collections.appUsers, userId), {
      role: "MEMBER",
      memberProfileId: profileId,
      updatedAt: nowSentinel(),
    } satisfies Partial<AppUserDoc>);

    const depthFromRoot = closureRows.reduce((m, r) => Math.max(m, r.depth), 0);

    return {
      memberProfileId: profileId,
      memberCode,
      sponsorId: sponsor?.id ?? null,
      placementParentId: parentId,
      leg,
      depthFromRoot,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Reads
// ─────────────────────────────────────────────────────────────────────────────

export interface UplineNode {
  memberProfileId: string;
  memberCode: string;
  displayName: string | null;
  level: number; // 1 = direct sponsor's position in closure terms
  status: string;
  kycApproved: boolean;
}

/** Batch-fetch member profiles + their AppUser + KycProfile, keyed by member profile id. */
export async function hydrateMembers(
  memberIds: string[],
): Promise<Map<string, { profile: MemberProfileDoc; displayName: string | null; kycApproved: boolean }>> {
  const firestore = db();
  const result = new Map<string, { profile: MemberProfileDoc; displayName: string | null; kycApproved: boolean }>();
  if (memberIds.length === 0) return result;

  const profileRefs = memberIds.map((id) => doc(Collections.memberProfiles, id));
  const profileSnaps = await firestore.getAll(...profileRefs);
  const profiles = new Map<string, MemberProfileDoc>();
  for (const snap of profileSnaps) {
    if (snap.exists) profiles.set(snap.id, snap.data() as MemberProfileDoc);
  }

  const userIds = [...new Set([...profiles.values()].map((p) => p.userId))];
  const userRefs = userIds.map((id) => doc(Collections.appUsers, id));
  const kycRefs = userIds.map((id) => doc(Collections.kycProfiles, id));
  const [userSnaps, kycSnaps] = await Promise.all([
    userRefs.length ? firestore.getAll(...userRefs) : Promise.resolve([]),
    kycRefs.length ? firestore.getAll(...kycRefs) : Promise.resolve([]),
  ]);
  const usersByUid = new Map(userSnaps.filter((s) => s.exists).map((s) => [s.id, s.data() as AppUserDoc]));
  const kycByUid = new Map(kycSnaps.filter((s) => s.exists).map((s) => [s.id, s.data() as KycProfileDoc]));

  for (const id of memberIds) {
    const profile = profiles.get(id);
    if (!profile) continue;
    result.set(id, {
      profile,
      displayName: usersByUid.get(profile.userId)?.displayName ?? null,
      kycApproved: kycByUid.get(profile.userId)?.status === "APPROVED",
    });
  }
  return result;
}

/**
 * The new member's ancestors, nearest first, capped at `maxDepth`. This is the
 * exact list the commission engine fans out over on MEMBER_JOINED
 * (Level 0 = depth 1 here = direct sponsor).
 */
export async function getUplineChain(
  memberProfileId: string,
  maxDepth = MAX_COMMISSION_DEPTH,
): Promise<UplineNode[]> {
  const snap = await db()
    .collection(Collections.networkClosure)
    .where("descendantId", "==", memberProfileId)
    .where("depth", ">=", 1)
    .where("depth", "<=", maxDepth)
    .orderBy("depth", "asc")
    .get();

  const edges = snap.docs.map((d) => d.data() as NetworkClosureDoc);
  const hydrated = await hydrateMembers(edges.map((e) => e.ancestorId));

  return edges.flatMap((e) => {
    const h = hydrated.get(e.ancestorId);
    if (!h) return [];
    return [
      {
        memberProfileId: e.ancestorId,
        memberCode: h.profile.memberCode,
        displayName: h.displayName,
        level: e.depth,
        status: h.profile.status,
        kycApproved: h.kycApproved,
      },
    ];
  });
}

export interface LevelSummaryRow {
  level: number;
  memberCount: number;
  activeCount: number;
}

/**
 * Per-level headcount of a member's downline, up to `maxDepth`. Powers the
 * genealogy *summary* view (brief §5.4) — the default, not a full tree render.
 * Earnings-per-level are joined in by the wallet module later.
 */
export async function getDownlineLevelSummary(
  memberProfileId: string,
  maxDepth = MAX_COMMISSION_DEPTH,
): Promise<LevelSummaryRow[]> {
  const snap = await db()
    .collection(Collections.networkClosure)
    .where("ancestorId", "==", memberProfileId)
    .where("depth", ">=", 1)
    .where("depth", "<=", maxDepth)
    .get();

  const edges = snap.docs.map((d) => d.data() as NetworkClosureDoc);
  const byDepth = new Map<number, string[]>();
  for (const e of edges) byDepth.set(e.depth, [...(byDepth.get(e.depth) ?? []), e.descendantId]);

  const allDescendantIds = edges.map((e) => e.descendantId);
  const hydrated = await hydrateMembers(allDescendantIds);

  return [...byDepth.entries()]
    .sort(([a], [b]) => a - b)
    .map(([level, ids]) => ({
      level,
      memberCount: ids.length,
      activeCount: ids.filter((id) => hydrated.get(id)?.profile.status === "ACTIVE").length,
    }));
}

export interface DownlineMemberRow {
  memberProfileId: string;
  memberCode: string;
  displayName: string | null;
  level: number;
  status: string;
  joinedAt: Date;
}

/** One level of a member's downline, paginated — the tap-to-expand payload. */
export async function getDownlineAtLevel(
  memberProfileId: string,
  level: number,
  opts: { skip?: number; take?: number } = {},
): Promise<DownlineMemberRow[]> {
  let query = db()
    .collection(Collections.networkClosure)
    .where("ancestorId", "==", memberProfileId)
    .where("depth", "==", level)
    .orderBy("descendantJoinedAt", "asc")
    .limit(Math.min(opts.take ?? 50, 200));
  if (opts.skip) query = query.offset(opts.skip);

  const snap = await query.get();
  const edges = snap.docs.map((d) => d.data() as NetworkClosureDoc);
  const hydrated = await hydrateMembers(edges.map((e) => e.descendantId));

  return edges.flatMap((e) => {
    const h = hydrated.get(e.descendantId);
    if (!h) return [];
    return [
      {
        memberProfileId: e.descendantId,
        memberCode: h.profile.memberCode,
        displayName: h.displayName,
        level: e.depth,
        status: h.profile.status,
        joinedAt: e.descendantJoinedAt.toDate(),
      },
    ];
  });
}

/**
 * The lineage path from `rootMemberId` down to `targetMemberId` (inclusive of
 * both ends), or null if target is not in root's downline. Backs member search
 * in the genealogy view — show just the branch, not the whole tree.
 */
export async function getLineagePath(
  rootMemberId: string,
  targetMemberId: string,
): Promise<DownlineMemberRow[] | null> {
  const linkSnap = await doc(Collections.networkClosure, `${rootMemberId}_${targetMemberId}`).get();
  if (!linkSnap.exists) return null;

  // Every node X on the path root -> ... -> target: X must be an
  // ancestor-or-self of target AND a descendant-or-self of root. Read both
  // sets of edges and keep root's edges (root -> X) whose X qualifies — that
  // way depth/descendantJoinedAt on the kept edge are already root-relative
  // and X's own join date, exactly like the original query's `descendant.*`.
  const [targetAncestorsSnap, rootDescendantsSnap] = await Promise.all([
    db().collection(Collections.networkClosure).where("descendantId", "==", targetMemberId).get(),
    db().collection(Collections.networkClosure).where("ancestorId", "==", rootMemberId).get(),
  ]);
  const targetAncestorIds = new Set(
    targetAncestorsSnap.docs.map((d) => (d.data() as NetworkClosureDoc).ancestorId),
  );
  const pathEdges = rootDescendantsSnap.docs
    .map((d) => d.data() as NetworkClosureDoc)
    .filter((e) => targetAncestorIds.has(e.descendantId))
    .sort((a, b) => a.depth - b.depth);

  const hydrated = await hydrateMembers(pathEdges.map((e) => e.descendantId));

  return pathEdges.flatMap((e) => {
    const h = hydrated.get(e.descendantId);
    if (!h) return [];
    return [
      {
        memberProfileId: e.descendantId,
        memberCode: h.profile.memberCode,
        displayName: h.displayName,
        level: e.depth,
        status: h.profile.status,
        joinedAt: e.descendantJoinedAt.toDate(),
      },
    ];
  });
}

export interface NetworkTotals {
  /** Everyone below this member in the binary tree (both legs, all depths). */
  totalDownline: number;
  /** People this member personally referred (`sponsorId`), wherever they were placed. */
  directReferrals: number;
  /** Frontline slots filled (0–2): the members sitting directly under this one. */
  frontline: number;
  deepestLevel: number;
  joinedThisMonth: number;
}

export async function getNetworkTotals(memberProfileId: string): Promise<NetworkTotals> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const startOfMonthTs = Timestamp.fromDate(startOfMonth);

  const base = () => db().collection(Collections.networkClosure).where("ancestorId", "==", memberProfileId);

  const [totalDownlineSnap, frontlineSnap, referralsSnap, allEdgesSnap] = await Promise.all([
    base().where("depth", ">=", 1).count().get(),
    base().where("depth", "==", 1).count().get(),
    db().collection(Collections.memberProfiles).where("sponsorId", "==", memberProfileId).count().get(),
    base().where("depth", ">=", 1).get(),
  ]);

  const descendantIds = allEdgesSnap.docs.map((d) => (d.data() as NetworkClosureDoc).descendantId);
  const hydrated = await hydrateMembers(descendantIds);
  const deepestLevel = allEdgesSnap.docs.reduce((m, d) => Math.max(m, (d.data() as NetworkClosureDoc).depth), 0);
  const joinedThisMonth = descendantIds.filter(
    (id) => (hydrated.get(id)?.profile.joinedAt.toMillis() ?? 0) >= startOfMonthTs.toMillis(),
  ).length;

  return {
    totalDownline: totalDownlineSnap.data().count,
    directReferrals: referralsSnap.data().count,
    frontline: frontlineSnap.data().count,
    deepestLevel,
    joinedThisMonth,
  };
}

export interface FullDownlineRow {
  memberProfileId: string;
  memberCode: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  level: number;
  status: string;
  kycStatus: string;
  sponsorCode: string | null;
  /** Who they sit directly under in the binary tree, and on which side. */
  placementParentCode: string | null;
  leg: BinaryLeg | null;
  joinedAt: Date;
}

/**
 * The complete downline of `memberProfileId` (every depth >= 1), ordered by
 * level then join date. Backs the admin "Export genealogy to CSV" action —
 * bounded work because the closure table already stores every edge.
 */
export async function getFullDownline(
  memberProfileId: string,
  maxDepth = MAX_COMMISSION_DEPTH,
): Promise<FullDownlineRow[]> {
  const snap = await db()
    .collection(Collections.networkClosure)
    .where("ancestorId", "==", memberProfileId)
    .where("depth", ">=", 1)
    .where("depth", "<=", maxDepth)
    .get();

  const firestore = db();
  const edges = snap.docs.map((d) => d.data() as NetworkClosureDoc);
  const descendantIds = edges.map((e) => e.descendantId);

  const profileRefs = descendantIds.map((id) => doc(Collections.memberProfiles, id));
  const profileSnaps = descendantIds.length ? await firestore.getAll(...profileRefs) : [];
  const profiles = new Map(profileSnaps.filter((s) => s.exists).map((s) => [s.id, s.data() as MemberProfileDoc]));

  const userIds = [...new Set([...profiles.values()].map((p) => p.userId))];
  const sponsorIds = [
    ...new Set(
      [...profiles.values()].flatMap((p) => [p.sponsorId, p.placementParentId]).filter((x): x is string => !!x),
    ),
  ];
  const [userSnaps, kycSnaps, sponsorSnaps] = await Promise.all([
    userIds.length ? firestore.getAll(...userIds.map((id) => doc(Collections.appUsers, id))) : [],
    userIds.length ? firestore.getAll(...userIds.map((id) => doc(Collections.kycProfiles, id))) : [],
    sponsorIds.length ? firestore.getAll(...sponsorIds.map((id) => doc(Collections.memberProfiles, id))) : [],
  ]);
  const usersByUid = new Map(userSnaps.filter((s) => s.exists).map((s) => [s.id, s.data() as AppUserDoc]));
  const kycByUid = new Map(kycSnaps.filter((s) => s.exists).map((s) => [s.id, s.data() as KycProfileDoc]));
  const sponsorsById = new Map(sponsorSnaps.filter((s) => s.exists).map((s) => [s.id, s.data() as MemberProfileDoc]));

  return edges
    .flatMap((e) => {
      const profile = profiles.get(e.descendantId);
      if (!profile) return [];
      const appUser = usersByUid.get(profile.userId);
      return [
        {
          memberProfileId: e.descendantId,
          memberCode: profile.memberCode,
          displayName: appUser?.displayName ?? null,
          email: appUser?.email ?? null,
          phone: appUser?.phone ?? null,
          level: e.depth,
          status: profile.status,
          kycStatus: kycByUid.get(profile.userId)?.status ?? "NOT_SUBMITTED",
          sponsorCode: profile.sponsorId ? (sponsorsById.get(profile.sponsorId)?.memberCode ?? null) : null,
          placementParentCode: profile.placementParentId
            ? (sponsorsById.get(profile.placementParentId)?.memberCode ?? null)
            : null,
          leg: profile.leg ?? null,
          joinedAt: profile.joinedAt.toDate(),
        },
      ];
    })
    .sort((a, b) => a.level - b.level || a.joinedAt.getTime() - b.joinedAt.getTime());
}
