"use server";

import { z } from "zod";
import { requireCapability, requireUser } from "@/server/auth/guards";
import { log } from "@/server/log";
import { getMemberContext } from "@/server/member/context";
import { joinNetwork, NetworkError, getDownlineAtLevel, getFullDownline } from "@/server/network/genealogy";
import { Collections, doc } from "@/server/firestore";
import type { MemberProfileDoc } from "@/server/models";
import { normalizeMemberCode } from "@/server/network/member-code";
import { parseLeg } from "@/lib/join/leg";

// ── Join the network ────────────────────────────────────────────────────────

const joinSchema = z.object({
  referralCode: z.string().trim().min(3, "Enter your sponsor's referral code"),
});

export type JoinState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; memberCode: string };

export async function joinNetworkAction(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const parsed = joinSchema.safeParse({ referralCode: formData.get("referralCode") });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const code = normalizeMemberCode(parsed.data.referralCode);
  if (!code) {
    return { status: "error", message: "That doesn't look like a valid referral code (e.g. AMA-7KQ4MT)." };
  }

  let user;
  try {
    user = await requireUser();
  } catch {
    return { status: "error", message: "Please sign in first, then join the network." };
  }

  try {
    // side an invite link asked for; anything else means "auto" (sponsor's weaker leg)
    const result = await joinNetwork({
      userId: user.uid,
      sponsorCode: code,
      preferredLeg: parseLeg(String(formData.get("leg") ?? "")) ?? "AUTO",
    });
    log.info("joinNetworkAction success", { userId: user.uid, memberCode: result.memberCode });
    return { status: "success", memberCode: result.memberCode };
  } catch (err) {
    if (err instanceof NetworkError) return { status: "error", message: err.message };
    log.error("joinNetworkAction failed", { err: String(err) });
    return { status: "error", message: "Something went wrong. Please try again." };
  }
}

// ── Expand one downline level (tap-to-expand, brief §5.4) ───────────────────

const PREVIEW_NAMES = [
  "Priya S.", "Ravi Kumar", "Anjali M.", "Sunil P.", "Deepa R.", "Vikram T.",
  "Meena J.", "Arjun N.", "Kavya L.", "Rohit D.", "Nisha G.", "Sanjay B.",
];

export interface DownlineRowDTO {
  memberProfileId: string;
  memberCode: string;
  name: string;
  level: number;
  status: string;
  joinedAt: string;
}

export async function loadDownlineLevelAction(level: number, skip = 0): Promise<DownlineRowDTO[]> {
  const ctx = await getMemberContext();

  if (ctx.preview) {
    const count = Math.max(0, [0, 4, 9, 12, 6, 3][level] ?? 0);
    return Array.from({ length: Math.max(0, Math.min(count - skip, 10)) }, (_, i) => ({
      memberProfileId: `preview-${level}-${skip + i}`,
      memberCode: `AMA-${(level * 100 + skip + i).toString().padStart(4, "0")}XY`,
      name: PREVIEW_NAMES[(skip + i) % PREVIEW_NAMES.length]!,
      level,
      status: (skip + i) % 4 === 3 ? "PENDING_KYC" : "ACTIVE",
      joinedAt: new Date(Date.now() - (skip + i + level) * 86400e3 * 3).toISOString(),
    }));
  }

  const rows = await getDownlineAtLevel(ctx.memberProfileId, level, { skip, take: 25 });
  return rows.map((r) => ({
    memberProfileId: r.memberProfileId,
    memberCode: r.memberCode,
    name: r.displayName ?? r.memberCode,
    level: r.level,
    status: r.status,
    joinedAt: r.joinedAt.toISOString(),
  }));
}

// ── Admin: export a member's full genealogy to CSV (brief §5.4 / FRD §3.2) ──

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export interface DownlineCsvResult {
  filename: string;
  csv: string;
  rowCount: number;
}

export async function exportDownlineCsvAction(memberProfileId: string): Promise<DownlineCsvResult> {
  await requireCapability("network.view");

  const rootSnap = await doc(Collections.memberProfiles, memberProfileId).get();
  if (!rootSnap.exists) throw new NetworkError("That member doesn't exist.", "SPONSOR_NOT_FOUND");
  const root = rootSnap.data() as MemberProfileDoc;

  const rows = await getFullDownline(memberProfileId);
  const header = [
    "Level", "Member Code", "Name", "Email", "Phone", "Sponsor Code", "Placed Under", "Leg", "Member Status", "KYC Status", "Joined At",
  ];
  const body = rows.map((r) =>
    [r.level, r.memberCode, r.displayName ?? "", r.email ?? "", r.phone ?? "", r.sponsorCode ?? "", r.placementParentCode ?? "", r.leg ?? "", r.status, r.kycStatus, r.joinedAt.toISOString()]
      .map(csvCell)
      .join(","),
  );

  const stamp = new Date().toISOString().slice(0, 10);
  return {
    filename: `genealogy_${root.memberCode}_${stamp}.csv`,
    csv: [header.map(csvCell).join(","), ...body].join("\r\n"),
    rowCount: rows.length,
  };
}
