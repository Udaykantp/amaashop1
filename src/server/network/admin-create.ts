import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { adminAuth } from "@/server/auth/admin";
import { Collections, db, doc, nowSentinel } from "@/server/firestore";
import type { AppUserDoc, KycProfileDoc } from "@/server/models";
import { log } from "@/server/log";
import { normalizePhone } from "@/server/referral/resolve";
import { NetworkError, joinNetwork } from "@/server/network/genealogy";
import type { LegPreference } from "@/server/network/placement";
import { randomTempPassword } from "@/server/network/member-code";

export interface AdminCreateDistributorInput {
  name: string;
  email: string;
  phone: string | null;
  /** Already-normalised `AMA-XXXXXX`, or null for the very first distributor. */
  sponsorCode: string | null;
}

export interface AdminCreateDistributorResult {
  memberProfileId: string;
  memberCode: string;
  userId: string;
  /** Where the new member landed in the binary tree. */
  placementParentId: string | null;
  leg: "LEFT" | "RIGHT" | null;
  /** Set only when a brand-new Firebase account was created for this enrollment. */
  resetLink: string | null;
  createdNewAccount: boolean;
}

async function findAppUserByEmail(email: string): Promise<{ id: string; data: AppUserDoc } | null> {
  const snap = await db().collection(Collections.appUsers).where("email", "==", email).limit(1).get();
  if (snap.empty) return null;
  return { id: snap.docs[0]!.id, data: snap.docs[0]!.data() as AppUserDoc };
}

/**
 * Create a Firebase Auth user, or — if one already exists for this email or
 * phone with no matching `app_users` Firestore doc (drifted state: an
 * orphaned account from earlier testing, a partial signup, a manually
 * created Auth user, etc.) — recover it instead of failing. The Firestore
 * `app_users` lookup alone can't see this, since Auth and Firestore are two
 * separate stores; `createUser` is the only thing that can tell us for sure.
 */
async function getOrCreateAuthUser(props: {
  email: string | null;
  phoneNumber?: string;
  password: string;
  displayName: string;
}): Promise<{ uid: string; created: boolean }> {
  try {
    const created = await adminAuth().createUser({
      ...(props.email ? { email: props.email } : {}),
      ...(props.phoneNumber ? { phoneNumber: props.phoneNumber } : {}),
      password: props.password,
      displayName: props.displayName,
    });
    return { uid: created.uid, created: true };
  } catch (err) {
    const code = (err as { code?: string } | null)?.code;
    if (code === "auth/email-already-exists" && props.email) {
      const existing = await adminAuth().getUserByEmail(props.email);
      log.warn("recovered a drifted Firebase Auth account by email (no matching app_users doc)", { uid: existing.uid, email: props.email });
      return { uid: existing.uid, created: false };
    }
    if (code === "auth/phone-number-already-exists" && props.phoneNumber) {
      const existing = await adminAuth().getUserByPhoneNumber(props.phoneNumber);
      log.warn("recovered a drifted Firebase Auth account by phone (no matching app_users doc)", { uid: existing.uid });
      return { uid: existing.uid, created: false };
    }
    throw err;
  }
}

/** Ensure an `app_users` doc exists for a (possibly recovered) Auth uid; throws if it's already a distributor. */
async function ensureAppUserDoc(uid: string, fallback: Omit<AppUserDoc, "createdAt" | "updatedAt">): Promise<void> {
  const ref = doc(Collections.appUsers, uid);
  const existing = await ref.get();
  if (!existing.exists) {
    await ref.set({ ...fallback, createdAt: nowSentinel(), updatedAt: nowSentinel() } satisfies AppUserDoc);
    return;
  }
  if ((existing.data() as AppUserDoc).memberProfileId) {
    throw new NetworkError("This email already belongs to a distributor.", "ALREADY_MEMBER");
  }
}

/**
 * Admin-side enrollment: lets the network/ops team add a distributor directly
 * (in person, over the phone) instead of waiting for self-service sign-up.
 *
 * Reuses `joinNetwork` for every genealogy invariant (sponsor lookup, loop
 * guard, unique code allocation + retry, closure-table insert, role upgrade)
 * so admin-created and self-joined distributors are indistinguishable
 * afterwards. The only new work here is standing up the account itself:
 *   - an existing, not-yet-a-distributor AppUser (e.g. a past customer) is
 *     upgraded in place — they keep their existing login.
 *   - otherwise a new Firebase Auth user + AppUser row is created, and a
 *     one-time password-reset link is returned for the admin to hand over.
 */
export async function adminCreateDistributor(
  input: AdminCreateDistributorInput,
): Promise<AdminCreateDistributorResult> {
  const email = input.email.trim().toLowerCase();
  const { sponsorCode } = input;

  // Validate the sponsor *before* touching Firebase, so a bad code never
  // leaves an orphaned account behind.
  if (sponsorCode) {
    const sponsorSnap = await db().collection(Collections.memberProfiles).where("memberCode", "==", sponsorCode).limit(1).get();
    if (sponsorSnap.empty) {
      throw new NetworkError("That sponsor referral code doesn't exist.", "SPONSOR_NOT_FOUND");
    }
  } else {
    const countSnap = await db().collection(Collections.memberProfiles).count().get();
    if (countSnap.data().count > 0) {
      throw new NetworkError(
        "Choose a sponsor — a rootless distributor can only be created when the network is empty.",
        "SPONSOR_NOT_FOUND",
      );
    }
  }

  const existingUser = await findAppUserByEmail(email);
  if (existingUser?.data.memberProfileId) {
    throw new NetworkError("This email already belongs to a distributor.", "ALREADY_MEMBER");
  }

  let userId: string;
  let resetLink: string | null = null;
  let createdNewAccount = false;
  let createdFirebaseUid: string | null = null;

  try {
    if (existingUser) {
      userId = existingUser.id;
    } else {
      const { uid, created } = await getOrCreateAuthUser({
        email,
        password: randomTempPassword(),
        displayName: input.name,
      });
      if (created) createdFirebaseUid = uid;
      userId = uid;

      await ensureAppUserDoc(userId, {
        email,
        phone: input.phone || null,
        displayName: input.name,
        role: "CONSUMER",
        status: "ACTIVE",
        extraCapabilities: [],
        deniedCapabilities: [],
        memberProfileId: null,
      });
      resetLink = await adminAuth().generatePasswordResetLink(email);
      createdNewAccount = created;
    }

    const join = await joinNetwork({ userId, sponsorCode });
    return {
      memberProfileId: join.memberProfileId,
      memberCode: join.memberCode,
      userId,
      placementParentId: join.placementParentId,
      leg: join.leg,
      resetLink,
      createdNewAccount,
    };
  } catch (err) {
    if (createdFirebaseUid) {
      await doc(Collections.appUsers, createdFirebaseUid).delete().catch(() => {});
      await adminAuth()
        .deleteUser(createdFirebaseUid)
        .catch((cleanupErr) =>
          log.error("failed to roll back orphaned Firebase user", {
            uid: createdFirebaseUid,
            err: String(cleanupErr),
          }),
        );
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Provision from a public /join application (see MemberApplication)
// ---------------------------------------------------------------------------

export interface ProvisionFromApplicationInput {
  fullName: string;
  /** applicant's 10-digit mobile (may already be normalised) */
  phone: string;
  email: string | null;
  /** already-normalised `AMA-XXXXXX` of the resolved sponsor */
  sponsorCode: string;
  idProofType: string | null;
  idProofLast4: string | null;
  /** DPDP consent timestamp captured on the form */
  consentAcceptedAt: Date | null;
  /**
   * Seed a `KycProfile` (status SUBMITTED) from the ID-proof last-4 + consent.
   * Defaults to `true` for the public funnel. The admin "enrol a distributor"
   * flow passes `false` — no ID proof is collected there, so KYC stays
   * NOT_SUBMITTED for the distributor to complete later.
   */
  seedKyc?: boolean;
  /** Which side of the sponsor to grow; defaults to AUTO (their weaker leg). */
  preferredLeg?: LegPreference;
}

export interface ProvisionFromApplicationResult extends AdminCreateDistributorResult {
  /** Firebase e-mail sign-in link for the new member, when an e-mail is on file. */
  signInLink: string | null;
}

/**
 * Turn an APPROVED `MemberApplication` into a real distributor:
 *  1. reuse an existing AppUser when the e-mail already has one, else create a
 *     Firebase Auth user keyed by phone (+ e-mail when supplied)
 *  2. `joinNetwork` under the sponsor — same path as self-serve + admin enroll
 *  3. seed a `KycProfile` (status SUBMITTED) carrying the ID-proof last-4 and
 *     the DPDP consent timestamp, so the KYC queue can pick it up
 *
 * Rolls back a freshly-created Firebase user on any downstream failure.
 */
export async function provisionMemberFromApplication(
  input: ProvisionFromApplicationInput,
): Promise<ProvisionFromApplicationResult> {
  const email = input.email?.trim().toLowerCase() || null;
  const phone10 = normalizePhone(input.phone) ?? input.phone.replace(/\D/g, "");
  const e164 = `+91${phone10}`;

  const sponsorSnap = await db().collection(Collections.memberProfiles).where("memberCode", "==", input.sponsorCode).limit(1).get();
  if (sponsorSnap.empty) {
    throw new NetworkError("The sponsor on this application no longer exists.", "SPONSOR_NOT_FOUND");
  }

  // An existing account (past customer) is upgraded in place; otherwise stand
  // up a fresh one.
  const existingByEmail = email ? await findAppUserByEmail(email) : null;
  if (existingByEmail?.data.memberProfileId) {
    throw new NetworkError("This e-mail already belongs to a distributor.", "ALREADY_MEMBER");
  }

  let userId: string;
  let signInLink: string | null = null;
  let createdNewAccount = false;
  let createdFirebaseUid: string | null = null;

  try {
    if (existingByEmail) {
      userId = existingByEmail.id;
    } else {
      const { uid, created } = await getOrCreateAuthUser({
        email,
        phoneNumber: e164,
        password: randomTempPassword(),
        displayName: input.fullName,
      });
      if (created) createdFirebaseUid = uid;
      userId = uid;

      await ensureAppUserDoc(userId, {
        email,
        phone: phone10,
        displayName: input.fullName,
        role: "CONSUMER",
        status: "ACTIVE",
        extraCapabilities: [],
        deniedCapabilities: [],
        memberProfileId: null,
      });
      if (email) signInLink = await adminAuth().generatePasswordResetLink(email);
      createdNewAccount = created;
    }

    const join = await joinNetwork({ userId, sponsorCode: input.sponsorCode, preferredLeg: input.preferredLeg });

    if (input.seedKyc !== false) {
      const kycRef = doc(Collections.kycProfiles, userId);
      const existingKyc = await kycRef.get();
      if (!existingKyc.exists) {
        const kycData: KycProfileDoc = {
          userId,
          status: "SUBMITTED",
          aadhaarEnc: null,
          aadhaarLast4: input.idProofType === "AADHAAR_LAST4" ? input.idProofLast4 : null,
          aadhaarHash: null,
          panEnc: null,
          panLast4: input.idProofType === "PAN" ? input.idProofLast4 : null,
          panHash: null,
          bankAccountEnc: null,
          bankAccountLast4: null,
          ifsc: null,
          accountHolderName: null,
          documentPaths: null,
          consentAcceptedAt: input.consentAcceptedAt ? Timestamp.fromDate(input.consentAcceptedAt) : null,
          submittedAt: nowSentinel(),
          reviewedByUserId: null,
          reviewedAt: null,
          rejectionReason: null,
          createdAt: nowSentinel(),
          updatedAt: nowSentinel(),
        };
        await kycRef.set(kycData);
      }
    }

    return {
      memberProfileId: join.memberProfileId,
      memberCode: join.memberCode,
      userId,
      placementParentId: join.placementParentId,
      leg: join.leg,
      resetLink: signInLink,
      signInLink,
      createdNewAccount,
    };
  } catch (err) {
    if (createdFirebaseUid) {
      await doc(Collections.appUsers, createdFirebaseUid).delete().catch(() => {});
      await adminAuth()
        .deleteUser(createdFirebaseUid)
        .catch((cleanupErr) =>
          log.error("failed to roll back orphaned Firebase user (from application)", {
            uid: createdFirebaseUid,
            err: String(cleanupErr),
          }),
        );
    }
    throw err;
  }
}
