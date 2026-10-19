import { ArrowUpRight, Heart, HelpCircle, Package, ShoppingCart, Store, Truck } from "lucide-react";
import Link from "next/link";
import { LogoutButton } from "@/components/account/logout-button";

interface AccountUser {
  email: string | null;
  displayName: string | null;
  createdAt: string | null;
}

const SHORTCUTS = [
  {
    name: "My Orders",
    desc: "Track deliveries and review past purchases",
    icon: Package,
    href: "/account/orders",
  },
  { name: "Track Order", desc: "Check where your latest delivery is", icon: Truck, href: "/track-order" },
  { name: "Wishlist", desc: "Items you've saved to buy later", icon: Heart, href: "/wishlist" },
  { name: "Your Cart", desc: "Review what's ready for checkout", icon: ShoppingCart, href: "/cart" },
  { name: "Help & Support", desc: "Returns, questions and contact", icon: HelpCircle, href: "/contact" },
  { name: "Continue Shopping", desc: "Browse fresh arrivals and deals", icon: Store, href: "/shop" },
];

function initials(source: string): string {
  const base = (source.split("@")[0] ?? source).replace(/[._-]+/g, " ").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  const chars =
    parts.length > 1
      ? `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`
      : base.slice(0, 2);
  return chars.toUpperCase() || "A";
}

export function LoggedInView({ user }: { user: AccountUser }) {
  const fullName = user.displayName ?? undefined;
  const displayName = fullName || user.email?.split("@")[0] || "Account";
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:py-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">My Account</p>

      {/* Profile summary */}
      <section className="mt-3 flex flex-col gap-5 rounded-2xl border border-neutral-200 bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xl font-semibold text-white">
            {initials(fullName || user.email || "A")}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-neutral-900">{displayName}</h1>
            <p className="truncate text-sm text-neutral-500">{user.email}</p>
            {memberSince && (
              <p className="mt-1 text-xs text-neutral-400">Member since {memberSince}</p>
            )}
          </div>
        </div>
        <div className="shrink-0 max-sm:w-full">
          <LogoutButton />
        </div>
      </section>

      {/* Account shortcuts */}
      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-neutral-400">
        Manage
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SHORTCUTS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-start gap-4 rounded-xl border border-neutral-200 bg-white p-5 transition-all hover:border-emerald-300 hover:shadow-sm"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-100">
              <item.icon size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-sm font-semibold text-neutral-900">
                {item.name}
                <ArrowUpRight
                  size={15}
                  className="text-neutral-300 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-emerald-500"
                />
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-neutral-500">
                {item.desc}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
