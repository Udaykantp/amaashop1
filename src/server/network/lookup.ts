import "server-only";
import { Collections, db } from "@/server/firestore";
import type { AppUserDoc, MemberProfileDoc } from "@/server/models";
import { normalizeRef } from "@/server/referral/resolve";

export interface FoundMember {
  id: string;
  data: MemberProfileDoc;
}

/**
 * Find a distributor by their AMA referral code OR their mobile number — the two
 * ids people actually have to hand. Unlike `resolveReferrer` this does not hide
 * frozen/terminated members: an admin looking at the genealogy needs to see them.
 * Returns null when the input is neither shape or nobody matches.
 */
export async function findMemberByCodeOrPhone(input: string | null | undefined): Promise<FoundMember | null> {
  const ref = normalizeRef(input);
  // Same last resort as `resolveReferrer`: a string that isn't a valid phone or
  // strict AMA code may still be an exact legacy/seed code (e.g. AMA-ROOT01).
  const kind = ref?.kind ?? "code";
  const value = ref?.value ?? (input ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (!value) return null;

  if (kind === "code") {
    const snap = await db().collection(Collections.memberProfiles).where("memberCode", "==", value).limit(1).get();
    return snap.empty ? null : { id: snap.docs[0]!.id, data: snap.docs[0]!.data() as MemberProfileDoc };
  }

  const userSnap = await db()
    .collection(Collections.appUsers)
    .where("phone", "in", [value, `+91${value}`, `91${value}`])
    .get();
  for (const u of userSnap.docs) {
    const profileId = (u.data() as AppUserDoc).memberProfileId;
    if (!profileId) continue;
    const p = await db().collection(Collections.memberProfiles).doc(profileId).get();
    if (p.exists) return { id: p.id, data: p.data() as MemberProfileDoc };
  }
  return null;
}
