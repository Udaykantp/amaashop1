import "server-only";
import { Collections, doc } from "@/server/firestore";
import type { AppUserDoc, MemberProfileDoc } from "@/server/models";
import {
  getBinarySummary,
  getBinaryTree,
  type BinarySummary,
  type BinaryTree,
} from "@/server/network/binary-tree";
import { findMemberByCodeOrPhone } from "@/server/network/lookup";

/**
 * The distributor's own view of their binary team (/office/team). Everything
 * here is scoped to the signed-in distributor's downline: the chart can be
 * re-centred on anyone below them but never above, and contact details are
 * stripped before anything is returned.
 */

export interface MyPlacement {
  referredBy: { code: string; name: string | null } | null;
  placedUnder: { code: string; name: string | null } | null;
  leg: "LEFT" | "RIGHT" | null;
  /** False until the network has been converted to the binary plan. */
  binary: boolean;
}

export interface MyTeamView {
  placement: MyPlacement;
  /** The member the chart is centred on — the distributor, or someone in their downline. */
  center: { id: string; code: string; isMe: boolean };
  tree: BinaryTree | null;
  /** Volumes for the two legs — only for the distributor's own view, since it's their pay basis. */
  summary: BinarySummary | null;
}

async function nameAndCode(profileId: string | null | undefined): Promise<{ code: string; name: string | null } | null> {
  if (!profileId) return null;
  const snap = await doc(Collections.memberProfiles, profileId).get();
  if (!snap.exists) return null;
  const p = snap.data() as MemberProfileDoc;
  const u = await doc(Collections.appUsers, p.userId).get();
  return { code: p.memberCode, name: u.exists ? ((u.data() as AppUserDoc).displayName ?? null) : null };
}

export async function getMyTeamView(myProfileId: string, atCode: string | null, depth: number): Promise<MyTeamView> {
  const meSnap = await doc(Collections.memberProfiles, myProfileId).get();
  const me = meSnap.data() as MemberProfileDoc;
  const binary = me.placementStrategy === "BINARY";

  const [referredBy, placedUnder] = await Promise.all([nameAndCode(me.sponsorId), nameAndCode(me.placementParentId)]);
  const placement: MyPlacement = { referredBy, placedUnder, leg: me.leg ?? null, binary };

  let centerId = myProfileId;
  let centerCode = me.memberCode;
  if (atCode && atCode !== me.memberCode) {
    const found = await findMemberByCodeOrPhone(atCode);
    // only ever someone strictly below the signed-in distributor
    if (found && found.id !== myProfileId) {
      const inMyTeam = await doc(Collections.networkClosure, `${myProfileId}_${found.id}`).get();
      if (inMyTeam.exists) {
        centerId = found.id;
        centerCode = found.data.memberCode;
      }
    }
  }
  const isMe = centerId === myProfileId;

  if (!binary) return { placement, center: { id: centerId, code: centerCode, isMe }, tree: null, summary: null };

  const [rawTree, summary] = await Promise.all([
    getBinaryTree(centerId, depth),
    isMe ? getBinarySummary(centerId) : Promise.resolve(null),
  ]);

  // Strip what a distributor has no business seeing about their team: mobile
  // numbers and who referred whom. When centred on themself there is no "up".
  const tree: BinaryTree | null = rawTree
    ? {
        ...rawTree,
        nodes: rawTree.nodes.map((n) => ({ ...n, phone: null, sponsorCode: null })),
        upTo: isMe ? null : rawTree.upTo,
      }
    : null;

  return { placement, center: { id: centerId, code: centerCode, isMe }, tree, summary };
}
