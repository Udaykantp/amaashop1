"use client";

import {
  BookOpen,
  Boxes,
  Coins,
  LayoutDashboard,
  LifeBuoy,
  Medal,
  Share2,
  ShieldCheck,
  UserCircle,
  Users,
  Wallet,
  Banknote,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: typeof Users; exact?: boolean };
type Group = { title: string; items: Item[] };

const GROUPS: Group[] = [
  { title: "", items: [{ href: "/office", label: "Dashboard", icon: LayoutDashboard, exact: true }] },
  {
    title: "Network",
    items: [
      { href: "/office/team", label: "My Team", icon: Users },
      { href: "/office/referrals", label: "Sponsoring", icon: Share2 },
      { href: "/office/rank", label: "Rank & Rewards", icon: Medal },
    ],
  },
  {
    title: "Earnings",
    items: [
      { href: "/office/income", label: "Income Statement", icon: Coins },
      { href: "/office/wallet", label: "E-Wallet", icon: Wallet },
      { href: "/office/withdrawals", label: "Withdrawals", icon: Banknote },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/office/orders", label: "Orders & Repurchase", icon: Boxes },
      { href: "/office/kyc", label: "KYC & Bank", icon: ShieldCheck },
      { href: "/office/profile", label: "Profile & Security", icon: UserCircle },
    ],
  },
  {
    title: "Resources",
    items: [
      { href: "/office/downloads", label: "Marketing Kit", icon: BookOpen },
      { href: "/office/support", label: "Help & Support", icon: LifeBuoy },
    ],
  },
];

export function OfficeNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Back-office sections" className="flex flex-col gap-5">
      {GROUPS.map((group) => (
        <div key={group.title || "root"}>
          {group.title ? (
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {group.title}
            </p>
          ) : null}
          <div className="flex flex-col gap-0.5">
            {group.items.map(({ href, label, icon: Icon, exact }) => {
              const active = exact
                ? pathname === href
                : pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-teal-50 text-teal-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
