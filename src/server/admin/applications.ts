import "server-only";
import { Collections, db } from "@/server/firestore";
import type { AppUserDoc, MemberApplicationDoc, MemberProfileDoc } from "@/server/models";
import type { MemberApplicationSource, MemberApplicationStatus } from "@/server/enums";

export interface ApplicationListRow {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  age: number;
  city: string;
  state: string;
  referrerInput: string;
  sponsorCode: string | null;
  sponsorName: string | null;
  source: MemberApplicationSource;
  status: MemberApplicationStatus;
  createdAt: string;
}

export interface ApplicationStats {
  total: number;
  pending: number;
  onHold: number;
  approved: number;
  rejected: number;
}

/** Status counts for the registrations dashboard header. */
export async function applicationStats(): Promise<ApplicationStats> {
  const firestore = db();
  const count = (status: MemberApplicationStatus) =>
    firestore.collection(Collections.memberApplications).where("status", "==", status).count().get().then((s) => s.data().count);
  const [pending, onHold, approved, rejected] = await Promise.all([
    count("PENDING"),
    count("ON_HOLD"),
    count("APPROVED"),
    count("REJECTED"),
  ]);
  return { total: pending + onHold + approved + rejected, pending, onHold, approved, rejected };
}

/**
 * Firestore has no cross-field `contains` search — a text query over-fetches
 * a bounded recent batch and filters in memory, same pattern as
 * `admin/members.ts`. Fine at today's scale.
 */
const SEARCH_SCAN_LIMIT = 1000;

export async function listApplications(
  opts: { q?: string; status?: MemberApplicationStatus; skip?: number; take?: number } = {},
) {
  const take = Math.min(opts.take ?? 30, 100);
  const skip = opts.skip ?? 0;
  const q = opts.q?.trim().toLowerCase();
  const firestore = db();

  let rows: { id: string; data: MemberApplicationDoc }[];
  let total: number;

  if (q) {
    let query: FirebaseFirestore.Query = firestore.collection(Collections.memberApplications);
    if (opts.status) query = query.where("status", "==", opts.status);
    const snap = await query.orderBy("createdAt", "desc").limit(SEARCH_SCAN_LIMIT).get();
    const all = snap.docs.map((d) => ({ id: d.id, data: d.data() as MemberApplicationDoc }));
    const matched = all.filter(
      (r) =>
        r.data.fullName.toLowerCase().includes(q) ||
        r.data.phone.includes(q) ||
        r.data.email?.toLowerCase().includes(q) ||
        r.data.referrerInput.toLowerCase().includes(q) ||
        r.data.sponsorCodeSnapshot?.toLowerCase().includes(q),
    );
    total = matched.length;
    rows = matched.slice(skip, skip + take);
  } else {
    let query: FirebaseFirestore.Query = firestore.collection(Collections.memberApplications);
    if (opts.status) query = query.where("status", "==", opts.status);
    const [snap, countSnap] = await Promise.all([
      query.orderBy("createdAt", "desc").offset(skip).limit(take).get(),
      query.count().get(),
    ]);
    rows = snap.docs.map((d) => ({ id: d.id, data: d.data() as MemberApplicationDoc }));
    total = countSnap.data().count;
  }

  const sponsorIds = [...new Set(rows.map((r) => r.data.sponsorId).filter((x): x is string => !!x))];
  const sponsorSnaps = sponsorIds.length
    ? await firestore.getAll(...sponsorIds.map((id) => firestore.collection(Collections.memberProfiles).doc(id)))
    : [];
  const sponsorsById = new Map(sponsorSnaps.filter((s) => s.exists).map((s) => [s.id, s.data() as MemberProfileDoc]));
  const sponsorUserIds = [...new Set([...sponsorsById.values()].map((s) => s.userId))];
  const sponsorUserSnaps = sponsorUserIds.length
    ? await firestore.getAll(...sponsorUserIds.map((id) => firestore.collection(Collections.appUsers).doc(id)))
    : [];
  const sponsorUsersByUid = new Map(sponsorUserSnaps.filter((s) => s.exists).map((s) => [s.id, s.data() as AppUserDoc]));

  const list: ApplicationListRow[] = rows.map((r) => {
    const sponsor = r.data.sponsorId ? sponsorsById.get(r.data.sponsorId) : null;
    const sponsorUser = sponsor ? sponsorUsersByUid.get(sponsor.userId) : null;
    return {
      id: r.id,
      fullName: r.data.fullName,
      phone: r.data.phone,
      email: r.data.email,
      age: r.data.age,
      city: r.data.city,
      state: r.data.state,
      referrerInput: r.data.referrerInput,
      sponsorCode: r.data.sponsorCodeSnapshot,
      sponsorName: sponsorUser?.displayName ?? null,
      source: r.data.source,
      status: r.data.status,
      createdAt: r.data.createdAt.toDate().toISOString(),
    };
  });

  return { list, total, take };
}

export async function getApplicationDetail(id: string) {
  const firestore = db();
  const snap = await firestore.collection(Collections.memberApplications).doc(id).get();
  if (!snap.exists) return null;
  const a = snap.data() as MemberApplicationDoc;

  const [sponsorSnap, createdMemberSnap] = await Promise.all([
    a.sponsorId ? firestore.collection(Collections.memberProfiles).doc(a.sponsorId).get() : Promise.resolve(null),
    a.memberProfileId ? firestore.collection(Collections.memberProfiles).doc(a.memberProfileId).get() : Promise.resolve(null),
  ]);
  const sponsor = sponsorSnap?.exists ? (sponsorSnap.data() as MemberProfileDoc) : null;
  const createdMember = createdMemberSnap?.exists ? (createdMemberSnap.data() as MemberProfileDoc) : null;

  const userIds = [a.reviewedByUserId, a.createdByUserId, sponsor?.userId].filter((v): v is string => Boolean(v));
  const users = userIds.length
    ? (await firestore.getAll(...userIds.map((uid) => firestore.collection(Collections.appUsers).doc(uid))))
        .filter((s) => s.exists)
        .map((s) => ({ id: s.id, ...(s.data() as AppUserDoc) }))
    : [];
  const label = (uid: string | null) => {
    if (!uid) return null;
    const u = users.find((x) => x.id === uid);
    return u?.displayName ?? u?.email ?? null;
  };

  return {
    id,
    referrerInput: a.referrerInput,
    sponsorId: a.sponsorId,
    sponsorCodeSnapshot: a.sponsorCodeSnapshot,
    fullName: a.fullName,
    phone: a.phone,
    email: a.email,
    age: a.age,
    gender: a.gender,
    familyMemberCount: a.familyMemberCount,
    idProofType: a.idProofType,
    idProofLast4: a.idProofLast4,
    addressLine: a.addressLine,
    city: a.city,
    district: a.district,
    state: a.state,
    pincode: a.pincode,
    nomineeName: a.nomineeName,
    source: a.source,
    createdByUserId: a.createdByUserId,
    sponsorConfirmed: a.sponsorConfirmed,
    preferredLeg: a.preferredLeg ?? null,
    consentIp: a.consentIp,
    consentUserAgent: a.consentUserAgent,
    status: a.status,
    reviewedByUserId: a.reviewedByUserId,
    reviewNote: a.reviewNote,
    memberProfileId: a.memberProfileId,
    termsAcceptedAt: a.termsAcceptedAt?.toDate().toISOString() ?? null,
    captchaVerifiedAt: a.captchaVerifiedAt?.toDate().toISOString() ?? null,
    reviewedAt: a.reviewedAt?.toDate().toISOString() ?? null,
    createdAt: a.createdAt.toDate().toISOString(),
    sponsor: sponsor ? { id: a.sponsorId, memberCode: sponsor.memberCode } : null,
    createdMember: createdMember ? { id: a.memberProfileId, memberCode: createdMember.memberCode } : null,
    sponsorName: label(sponsor?.userId ?? null),
    reviewerLabel: label(a.reviewedByUserId),
    createdByLabel: label(a.createdByUserId),
  };
}

export type ApplicationDetail = NonNullable<Awaited<ReturnType<typeof getApplicationDetail>>>;
