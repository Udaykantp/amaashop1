"use client";

import {
  Boxes,
  FileClock,
  LayoutDashboard,
  Network,
  Percent,
  Repeat,
  Settings,
  Share2,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ADMIN_WORKSPACE_COOKIE,
  WORKSPACE_META,
  type AdminWorkspace,
} from "@/lib/admin/workspace";
import { cn } from "@/lib/utils";
import type { Capability } from "@/server/rbac";

type Item = { href: string; label: string; icon: typeof Users; exact?: boolean; cap?: Capability };
/** `scope`: which workspace this group belongs to. `"both"` = always visible. */
type Group = { title: string; scope: AdminWorkspace | "both"; items: Item[] };

const GROUPS: Group[] = [
  {
    title: "",
    scope: "both",
    items: [{ href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true }],
  },
  {
    title: "Catalog",
    scope: "store",
    items: [
      { href: "/admin/catalog", label: "Products", icon: Boxes, cap: "catalog.view" },
      { href: "/admin/autoship", label: "Autoship kits", icon: Repeat, cap: "autoship.write" },
      { href: "/admin/orders", label: "Orders", icon: ShoppingCart, cap: "order.view" },
    ],
  },
  {
    title: "Distributor network",
    scope: "mlm",
    items: [
      { href: "/admin/applications", label: "Registrations", icon: UserPlus, cap: "application.review" },
      { href: "/admin/members", label: "Distributors", icon: Users, cap: "member.view" },
      { href: "/admin/referrers", label: "Referrers", icon: Share2, cap: "member.view" },
      { href: "/admin/network", label: "Genealogy tree", icon: Network, cap: "network.view" },
      { href: "/admin/kyc", label: "ID verification (KYC)", icon: ShieldCheck, cap: "kyc.review" },
    ],
  },
  {
    title: "Commissions & payouts",
    scope: "mlm",
    items: [
      { href: "/admin/commission", label: "Commission rules", icon: Percent, cap: "commission.rules.write" },
      { href: "/admin/runs", label: "Commission runs", icon: Sparkles, cap: "commission.run.preview" },
      { href: "/admin/withdrawals", label: "Withdrawals", icon: Wallet, cap: "withdrawal.review" },
      { href: "/admin/payouts", label: "Payout batches", icon: Wallet, cap: "payout.process" },
    ],
  },
  {
    title: "Platform",
    scope: "both",
    items: [
      { href: "/admin/users", label: "Users & roles", icon: Users, cap: "users.manage" },
      { href: "/admin/audit", label: "Audit log", icon: FileClock, cap: "audit.view" },
      { href: "/admin/settings", label: "Settings", icon: Settings, cap: "settings.write" },
    ],
  },
];

function persistWorkspace(ws: AdminWorkspace) {
  try {
    document.cookie = `${ADMIN_WORKSPACE_COOKIE}=${ws}; path=/admin; max-age=31536000; samesite=lax`;
  } catch {
    /* cookies disabled — in-memory state still works for the session */
  }
}

export function AdminNav({
  capabilities,
  initialWorkspace,
}: {
  capabilities: string[];
  initialWorkspace: AdminWorkspace;
}) {
  const pathname = usePathname();
  const [ws, setWs] = useState<AdminWorkspace>(initialWorkspace);

  const has = (cap?: Capability) =>
    !cap || capabilities.includes("*") || capabilities.includes(cap);

  const groupHasCurrentPath = (g: Group) =>
    g.items.some((i) =>
      i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(i.href + "/"),
    );

  // Which workspaces does this operator actually have sections in?
  const availableScopes = new Set<AdminWorkspace>();
  for (const g of GROUPS) {
    if (g.scope === "both") continue;
    if (g.items.some((i) => has(i.cap))) availableScopes.add(g.scope);
  }
  const showToggle = availableScopes.size === 2;

  // If the operator only has one side, pin to it.
  useEffect(() => {
    if (availableScopes.size === 1) {
      const only = [...availableScopes][0]!;
      if (only && only !== ws) setWs(only);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live-recolour the admin shell the moment the workspace changes (the layout
  // set the initial `data-admin-ws` server-side, so first paint is correct).
  useEffect(() => {
    document.querySelector("[data-admin-shell]")?.setAttribute("data-admin-ws", ws);
  }, [ws]);

  function change(next: AdminWorkspace) {
    setWs(next);
    persistWorkspace(next);
  }

  const visibleGroups = GROUPS.map((g) => ({
    group: g,
    items: g.items.filter((i) => has(i.cap)),
  })).filter(
    ({ group, items }) =>
      items.length > 0 &&
      (group.scope === "both" || group.scope === ws || groupHasCurrentPath(group)),
  );

  return (
    <nav aria-label="Admin sections" className="flex flex-1 flex-col overflow-y-auto">
      {showToggle ? (
        <div className="p-3 pb-1">
          <div
            role="group"
            aria-label="Console workspace"
            className="grid grid-cols-2 gap-1 rounded-lg border bg-muted/40 p-1"
          >
            {(["store", "mlm"] as const).map((w) => {
              const meta = WORKSPACE_META[w];
              const active = ws === w;
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => change(w)}
                  aria-pressed={active}
                  title={meta.title}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors",
                    active
                      ? "bg-card text-[hsl(var(--ws))] shadow-sm ring-1 ring-[hsl(var(--ws-line))]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {w === "store" ? (
                    <ShoppingBag className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Network className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {meta.label}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 flex items-center gap-1 px-1 text-[10px] font-medium text-[hsl(var(--ws))]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[hsl(var(--ws))]" />
            {WORKSPACE_META[ws].title}
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 p-3">
        {visibleGroups.map(({ group, items }) => {
          const offWorkspace =
            group.scope !== "both" && group.scope !== ws && groupHasCurrentPath(group);
          return (
            <div key={group.title || "root"}>
              {group.title ? (
                <p className="flex items-center gap-1.5 px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {group.title}
                  {offWorkspace ? (
                    <span className="rounded bg-muted px-1 py-px text-[9px] font-medium normal-case text-muted-foreground">
                      {WORKSPACE_META[group.scope as AdminWorkspace].label}
                    </span>
                  ) : null}
                </p>
              ) : null}
              <div className="flex flex-col gap-0.5">
                {items.map(({ href, label, icon: Icon, exact }) => {
                  const active = exact
                    ? pathname === href
                    : pathname === href || pathname.startsWith(href + "/");
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-[hsl(var(--ws-soft))] text-[hsl(var(--ws))]"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
