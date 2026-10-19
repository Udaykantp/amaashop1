import { OfficeStub } from "@/components/office/office-stub";

export const metadata = { title: "Marketing Kit" };

export default function OfficeDownloadsPage() {
  return (
    <OfficeStub
      title="Marketing Kit"
      description="Everything you need to present AmaaShop professionally."
      bullets={[
        "Product catalogue and price list (PDF)",
        "Compensation plan presentation (editable + PDF)",
        "Ready-to-post social creatives with your referral code baked in",
        "WhatsApp / status templates in Hindi and English",
        "Training videos: onboarding, first 30 days, objection handling",
        "Brand guidelines — logos, colours, do's and don'ts",
      ]}
    />
  );
}
