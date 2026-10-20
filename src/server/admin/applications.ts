import "server-only";
import type { MemberApplicationSource, MemberApplicationStatus } from "@/server/enums";

// DATABASE COMMENTED OUT — USING MOCK DATA
/*
import { Collections, db } from "@/server/firestore";
import type { AppUserDoc, MemberApplicationDoc, MemberProfileDoc } from "@/server/models";
*/

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

const MOCK_APPLICATIONS: ApplicationListRow[] = [
  {
    id: "app-101",
    fullName: "Vikas Malhotra",
    phone: "9876543210",
    email: "vikas.m@example.com",
    age: 32,
    city: "Jaipur",
    state: "Rajasthan",
    referrerInput: "AMA-7KQ4MT",
    sponsorCode: "AMA-7KQ4MT",
    sponsorName: "Sunita Devi",
    source: "PUBLIC",
    status: "PENDING",
    createdAt: new Date(Date.now() - 4 * 3600e3).toISOString(),
  },
  {
    id: "app-102",
    fullName: "Meenakshi Sundaram",
    phone: "9876543211",
    email: "meenakshi.s@example.com",
    age: 28,
    city: "Madurai",
    state: "Tamil Nadu",
    referrerInput: "AMA-101LFT",
    sponsorCode: "AMA-101LFT",
    sponsorName: "Priya Sharma",
    source: "ADMIN",
    status: "APPROVED",
    createdAt: new Date(Date.now() - 24 * 3600e3).toISOString(),
  },
  {
    id: "app-103",
    fullName: "Kavita Rao",
    phone: "9876543212",
    email: "kavita.rao@example.com",
    age: 35,
    city: "Hyderabad",
    state: "Telangana",
    referrerInput: "AMA-102RGT",
    sponsorCode: "AMA-102RGT",
    sponsorName: "Ravi Kumar",
    source: "PUBLIC",
    status: "ON_HOLD",
    createdAt: new Date(Date.now() - 48 * 3600e3).toISOString(),
  },
];

export async function applicationStats(): Promise<ApplicationStats> {
  return {
    total: 3,
    pending: 1,
    onHold: 1,
    approved: 1,
    rejected: 0,
  };
}

export async function listApplications(
  opts: { q?: string; status?: MemberApplicationStatus; skip?: number; take?: number } = {},
) {
  const take = Math.min(opts.take ?? 30, 100);
  const skip = opts.skip ?? 0;
  const q = opts.q?.trim().toLowerCase();

  let filtered = MOCK_APPLICATIONS;
  if (opts.status) {
    filtered = filtered.filter((a) => a.status === opts.status);
  }
  if (q) {
    filtered = filtered.filter(
      (a) =>
        a.fullName.toLowerCase().includes(q) ||
        a.phone.includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.referrerInput.toLowerCase().includes(q),
    );
  }

  const total = filtered.length;
  const list = filtered.slice(skip, skip + take);

  return { list, total, take };
}

export async function getApplicationDetail(id: string) {
  const a = MOCK_APPLICATIONS.find((x) => x.id === id) ?? MOCK_APPLICATIONS[0]!;

  return {
    id: a.id,
    fullName: a.fullName,
    phone: a.phone,
    email: a.email,
    age: a.age,
    gender: "MALE",
    familyMemberCount: 4,
    idProofType: "AADHAAR_LAST4",
    idProofLast4: "5821",
    nomineeName: "Geeta Malhotra",
    addressLine: "12, Malviya Nagar Main Road",
    city: a.city,
    district: a.city,
    state: a.state,
    pincode: "302017",
    referrerInput: a.referrerInput,
    sponsorCodeSnapshot: a.sponsorCode,
    sponsorName: a.sponsorName,
    preferredLeg: "LEFT" as const,
    sponsorConfirmed: true,
    source: a.source,
    status: a.status,
    createdAt: a.createdAt,
    termsAcceptedAt: a.createdAt,
    captchaVerifiedAt: a.createdAt,
    consentIp: "127.0.0.1",
    consentUserAgent: "Mozilla/5.0",
    reviewedAt: null,
    reviewerLabel: null,
    reviewNote: null,
    createdByLabel: a.source === "ADMIN" ? "Admin User" : null,
    sponsor: { id: "mem-1", memberCode: a.sponsorCode ?? "AMA-ROOT01" },
    createdMember: a.status === "APPROVED" ? { id: "mem-2", memberCode: "AMA-101LFT" } : null,
    memberProfileId: a.status === "APPROVED" ? "mem-2" : null,
  };
}
