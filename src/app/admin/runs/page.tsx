import { AdminStub } from "@/components/admin/admin-stub";
import { ConnectBackend } from "@/components/admin/connect-backend";
import { adminGuardCap } from "@/server/admin/context";

export const metadata = { title: "Commission runs" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const gate = await adminGuardCap("commission.run.preview");
  if (gate.preview) return <ConnectBackend missing={gate.missing} />;
  return <AdminStub title="Commission runs" description="Review a period's commission math in staging, then Release Funds to post it to e-wallets." phase="Phase 4" />;
}
