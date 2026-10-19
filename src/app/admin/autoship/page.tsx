import { AdminStub } from "@/components/admin/admin-stub";
import { ConnectBackend } from "@/components/admin/connect-backend";
import { adminGuardCap } from "@/server/admin/context";

export const metadata = { title: "Autoship kits" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const gate = await adminGuardCap("autoship.write");
  if (gate.preview) return <ConnectBackend missing={gate.missing} />;
  return <AdminStub title="Autoship kits" description="Group products into recurring subscription bundles and tie them to distributor active status." phase="Phase 2 + Phase 4" />;
}
