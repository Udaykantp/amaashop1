"use client";

import { LayoutDashboard, Users, Wallet, Package, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Plain-language labels (brief §5.1) — "Your team", not "Downline".
const ITEMS = [
  { href: "/member", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/member/network", label: "Your team", icon: Users },
  { href: "/member/wallet", label: "Money you've earned", icon: Wallet },
  { href: "/member/orders", label: "Your orders", icon: Package },
  { href: "/member/kyc", label: "KYC & bank details", icon: ShieldCheck },
];

export function MemberNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Member sections"
      className="no-scrollbar -mx-5 flex gap-1 overflow-x-auto px-5 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0"
    >
      {ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span className="whitespace-nowrap">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
