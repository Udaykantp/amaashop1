import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Back-Office", template: "%s · AmaaShop Back-Office" },
  robots: { index: false, follow: false },
};

export default function OfficeAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      {children}
    </div>
  );
}
