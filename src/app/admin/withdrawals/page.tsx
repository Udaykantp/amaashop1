import { AdminStub } from "@/components/admin/admin-stub";
import { ConnectBackend } from "@/components/admin/connect-backend";
import { adminGuardCap } from "@/server/admin/context";

export const metadata = { title: "Withdrawals" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const gate = await adminGuardCap("withdrawal.review");
  if (gate.preview) return <ConnectBackend missing={gate.missing} />;
  return <AdminStub title="Withdrawals" description="Approve, hold, or reject distributor e-wallet withdrawal requests against fraud + threshold checks." phase="Phase 5" />;
}
