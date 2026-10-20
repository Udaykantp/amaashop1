import "server-only";
import type { BinarySummary, BinaryTree } from "@/server/network/binary-tree";

// DATABASE COMMENTED OUT — USING MOCK DATA
/*
import { Collections, doc } from "@/server/firestore";
import type { AppUserDoc, MemberProfileDoc } from "@/server/models";
import {
  getBinarySummary,
  getBinaryTree,
} from "@/server/network/binary-tree";
import { findMemberByCodeOrPhone } from "@/server/network/lookup";
*/

export interface MyPlacement {
  referredBy: { code: string; name: string | null } | null;
  placedUnder: { code: string; name: string | null } | null;
  leg: "LEFT" | "RIGHT" | null;
  binary: boolean;
}

export interface MyTeamView {
  placement: MyPlacement;
  center: { id: string; code: string; isMe: boolean };
  tree: BinaryTree | null;
  summary: BinarySummary | null;
}

export async function getMyTeamView(
  myProfileId: string,
  atCode: string | null,
  depth: number,
): Promise<MyTeamView> {
  const placement: MyPlacement = {
    referredBy: { code: "AMA-ROOT01", name: "Sunita Devi" },
    placedUnder: { code: "AMA-ROOT01", name: "Sunita Devi" },
    leg: "LEFT",
    binary: true,
  };

  const centerCode = atCode || "AMA-7KQ4MT";
  const isMe = !atCode || atCode === "AMA-7KQ4MT";

  const summary: BinarySummary = {
    left: {
      side: "LEFT",
      head: { id: "m-left-1", memberCode: "AMA-101LFT", name: "Priya Sharma" },
      members: 18,
      active: 14,
      volume: "34500.00",
    },
    right: {
      side: "RIGHT",
      head: { id: "m-right-1", memberCode: "AMA-102RGT", name: "Ravi Kumar" },
      members: 16,
      active: 12,
      volume: "28200.00",
    },
    payableVolume: "28200.00",
    carryVolume: "6300.00",
    weaker: "RIGHT",
  };

  const tree: BinaryTree = {
    depth,
    nodes: [
      {
        id: myProfileId,
        memberCode: "AMA-7KQ4MT",
        name: "You",
        status: "ACTIVE",
        leg: null,
        level: 0,
        parentId: null,
        leftId: "m-left-1",
        rightId: "m-right-1",
        leftCount: 18,
        rightCount: 16,
        joinedAt: new Date(Date.now() - 60 * 86400e3).toISOString(),
        phone: null,
        sponsorCode: null,
      },
      {
        id: "m-left-1",
        memberCode: "AMA-101LFT",
        name: "Priya Sharma",
        status: "ACTIVE",
        leg: "LEFT",
        level: 1,
        parentId: myProfileId,
        leftId: "m-left-2a",
        rightId: "m-left-2b",
        leftCount: 8,
        rightCount: 9,
        joinedAt: new Date(Date.now() - 40 * 86400e3).toISOString(),
        phone: null,
        sponsorCode: null,
      },
      {
        id: "m-right-1",
        memberCode: "AMA-102RGT",
        name: "Ravi Kumar",
        status: "ACTIVE",
        leg: "RIGHT",
        level: 1,
        parentId: myProfileId,
        leftId: null,
        rightId: null,
        leftCount: 0,
        rightCount: 0,
        joinedAt: new Date(Date.now() - 35 * 86400e3).toISOString(),
        phone: null,
        sponsorCode: null,
      },
      {
        id: "m-left-2a",
        memberCode: "AMA-201LFT",
        name: "Anjali Mishra",
        status: "ACTIVE",
        leg: "LEFT",
        level: 2,
        parentId: "m-left-1",
        leftId: null,
        rightId: null,
        leftCount: 0,
        rightCount: 0,
        joinedAt: new Date(Date.now() - 20 * 86400e3).toISOString(),
        phone: null,
        sponsorCode: null,
      },
      {
        id: "m-left-2b",
        memberCode: "AMA-202RGT",
        name: "Deepak Verma",
        status: "ACTIVE",
        leg: "RIGHT",
        level: 2,
        parentId: "m-left-1",
        leftId: null,
        rightId: null,
        leftCount: 0,
        rightCount: 0,
        joinedAt: new Date(Date.now() - 15 * 86400e3).toISOString(),
        phone: null,
        sponsorCode: null,
      },
    ],
    upTo: null,
  };

  return {
    placement,
    center: { id: myProfileId, code: centerCode, isMe },
    tree,
    summary,
  };
}
