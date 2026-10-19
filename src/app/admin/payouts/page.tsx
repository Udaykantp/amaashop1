import { AdminStub } from "@/components/admin/admin-stub";
import { ConnectBackend } from "@/components/admin/connect-backend";
import { adminGuardCap } from "@/server/admin/context";

export const metadata = { title: "Payouts" };
export const dynamic = "force-dynamic";

export default async function AdminPayoutsPage() {
  const gate = await adminGuardCap("payout.process");
  if (gate.preview) return <ConnectBackend missing={gate.missing} />;
  return (
    <AdminStub
      title="Payouts"
      description="Generate a payout batch from posted wallet balances, lock it, export the bank/UPI file, mark processed, reconcile. TDS computed per entry."
      phase="Phase 5 (KYC & payouts)"
    />
  );
}
