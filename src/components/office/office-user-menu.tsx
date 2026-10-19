"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { signOut } from "@/lib/auth/client";
import { formatINR } from "@/lib/format";

export function OfficeUserMenu({
  name,
  memberCode,
  rank,
  walletBalance,
}: {
  name: string | null;
  memberCode: string;
  rank: string;
  walletBalance: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <div className="hidden items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 sm:flex">
        <span className="tabular-nums">{formatINR(walletBalance)}</span>
        <span className="text-teal-300">·</span>
        <span>{rank}</span>
      </div>
      <div className="text-right leading-tight">
        <p className="text-sm font-medium text-slate-800">{name ?? memberCode}</p>
        <p className="font-mono text-[11px] text-slate-400">{memberCode}</p>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await signOut();
            router.replace("/office/login");
            router.refresh();
          })
        }
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
      >
        <LogOut className="h-3.5 w-3.5" />
        Sign out
      </button>
    </div>
  );
}
