import type { Metadata } from "next";
import { ComingSoon } from "@/components/member/coming-soon";

export const metadata: Metadata = { title: "Money you've earned" };

export default function WalletPage() {
  return (
    <ComingSoon
      title="Money you've earned"
      description="Every joining bonus and repurchase commission, with the exact order and person each one came from — plus withdrawals."
      phase="Phase 4 (commission engine) + Phase 5 (payouts)"
    />
  );
}
