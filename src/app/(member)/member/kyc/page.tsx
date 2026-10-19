import type { Metadata } from "next";
import { ComingSoon } from "@/components/member/coming-soon";

export const metadata: Metadata = { title: "KYC & bank details" };

export default function KycPage() {
  return (
    <ComingSoon
      title="KYC & bank details"
      description="A guided, resumable flow — Personal, Family/Nominee, Bank, Documents — with everything encrypted and shown masked."
      phase="Phase 5 (KYC & payouts)"
    />
  );
}
