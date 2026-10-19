import type { Metadata } from "next";
import Link from "next/link";
import { OfficeNav } from "@/components/office/office-nav";
import { OfficeUserMenu } from "@/components/office/office-user-menu";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { getOfficeContext } from "@/server/office/context";
import { getMemberDashboard } from "@/server/member/overview";
import { getRankProgress } from "@/server/office/data";

export const metadata: Metadata = {
  title: { default: "Back-Office", template: "%s · AmaaShop Back-Office" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function OfficeLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getOfficeContext();
  const [dash, rank] = await Promise.all([
    getMemberDashboard(ctx.memberProfileId).catch(() => null),
    getRankProgress(ctx.memberProfileId).catch(() => null),
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <ImpersonationBanner />

      {ctx.frozen ? (
        <div className="bg-amber-500 px-4 py-1.5 text-center text-xs font-semibold text-white">
          Your account is on hold — withdrawals and referral links are disabled. Contact support.
        </div>
      ) : null}

      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
          <Link href="/office" className="flex h-14 items-center gap-2 border-b border-slate-200 px-5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-600 text-sm font-bold text-white">
              A
            </span>
            <span className="font-serif text-base font-medium text-slate-900">AmaaShop</span>
            <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-700">
              Office
            </span>
          </Link>
          <div className="flex-1 overflow-y-auto p-3">
            <OfficeNav />
          </div>
          <div className="border-t border-slate-200 p-3 font-mono text-[10px] text-slate-400">
            {ctx.memberCode} · {ctx.status.replace(/_/g, " ").toLowerCase()}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white/85 px-5 backdrop-blur">
            <Link href="/office" className="font-serif text-base font-medium text-slate-900 lg:hidden">
              AmaaShop <span className="text-teal-700">Office</span>
            </Link>
            <div className="hidden lg:block" />
            <OfficeUserMenu
              name={ctx.displayName}
              memberCode={ctx.memberCode}
              rank={rank?.current ?? "Distributor"}
              walletBalance={dash?.walletBalance ?? "0"}
            />
          </header>

          <main className="min-w-0 flex-1 p-5 lg:p-8">
            <div className="mx-auto max-w-5xl animate-page-enter">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
