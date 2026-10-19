import Link from "next/link";
import { OfficeStub } from "@/components/office/office-stub";

export const metadata = { title: "Orders & Repurchase" };

export default function OfficeOrdersPage() {
  return (
    <>
      <OfficeStub
        title="Orders & Repurchase"
        description="Your joining package and every repurchase order, plus autoship."
        bullets={[
          "Joining package + repurchase order history with invoices",
          "One-tap reorder of your usual kit",
          "Autoship / subscription management (skip, pause, change date)",
          "BV earned per order and how it flowed to your upline",
          "Shipment tracking and delivery status",
          "GST invoice download (PDF)",
        ]}
      />
      <p className="mt-4 text-sm text-slate-500">
        For now, place repurchase orders on the{" "}
        <Link href="/shop" className="font-medium text-teal-700 hover:underline">
          store
        </Link>{" "}
        while signed in — BV is credited to your code automatically.
      </p>
    </>
  );
}
