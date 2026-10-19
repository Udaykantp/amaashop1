import Link from "next/link";
import { OfficeStub } from "@/components/office/office-stub";

export const metadata = { title: "Help & Support" };

export default function OfficeSupportPage() {
  return (
    <>
      <OfficeStub
        title="Help & Support"
        description="Raise a ticket and track it to resolution."
        bullets={[
          "Ticket categories: payout, KYC, genealogy, product, technical",
          "Attach screenshots and reference IDs",
          "Threaded replies with email + in-app notifications",
          "SLA countdown and escalation path",
          "Searchable knowledge base and FAQ",
          "Live chat during business hours",
        ]}
      />
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
        Meanwhile, reach us at{" "}
        <a href="mailto:support@amaashop.in" className="font-medium text-teal-700 hover:underline">
          support@amaashop.in
        </a>{" "}
        or via the{" "}
        <Link href="/contact" className="font-medium text-teal-700 hover:underline">
          contact form
        </Link>
        . Quote your distributor code for a faster response.
      </div>
    </>
  );
}
