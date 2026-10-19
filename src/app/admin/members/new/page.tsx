import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ConnectBackend } from "@/components/admin/connect-backend";
import { AddDistributorForm } from "@/components/admin/add-distributor-form";
import { PageHeader } from "@/components/patterns/page-header";
import { adminGuardCap } from "@/server/admin/context";

export const metadata = { title: "Add distributor" };
export const dynamic = "force-dynamic";

export default async function NewDistributorPage() {
  const gate = await adminGuardCap("member.create");
  if (gate.preview) return <ConnectBackend missing={gate.missing} />;

  return (
    <>
      <Link
        href="/admin/members"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All members
      </Link>
      <PageHeader
        title="Add a distributor"
        description="For phone or in-person sign-ups. Enter who referred them, which side to place them on, plus a name and mobile — they get a referral code and can shop right away."
      />
      <div className="max-w-lg">
        <AddDistributorForm />
      </div>
    </>
  );
}
