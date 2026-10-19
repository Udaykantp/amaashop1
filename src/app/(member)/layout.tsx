import type { Metadata } from "next";
import Link from "next/link";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { MemberNav } from "@/components/member/member-nav";

export const metadata: Metadata = {
  title: { default: "Member Portal", template: "%s · AmaaShop Member" },
  robots: { index: false, follow: false },
};

/**
 * Member portal shell. Separate from the storefront chrome — no shop header /
 * footer. Server-side auth happens per page via getMemberContext().
 */
export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <ImpersonationBanner />
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/member" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              A
            </span>
            <span className="font-serif text-lg font-medium">AmaaShop</span>
            <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
              Member
            </span>
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Back to shop
          </Link>
        </div>
      </header>

      <div className="container grid gap-6 py-6 lg:grid-cols-[200px_1fr]">
        <MemberNav />
        <main className="min-w-0 animate-page-enter">{children}</main>
      </div>
    </div>
  );
}
