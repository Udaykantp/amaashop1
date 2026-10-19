import type { Metadata } from "next";
import { ComingSoon } from "@/components/member/coming-soon";

export const metadata: Metadata = { title: "Your orders" };

export default function MemberOrdersPage() {
  return (
    <ComingSoon
      title="Your orders"
      description="Your joining package and repurchase orders, with quick reorder."
      phase="Phase 2 (storefront migration) + Phase 4 (repurchase)"
    />
  );
}
