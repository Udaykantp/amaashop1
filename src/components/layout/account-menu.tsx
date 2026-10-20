"use client";

import {
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  Package,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { signOut } from "@/lib/auth/client";
import { firebaseAuth } from "@/lib/firebase/client";
import { cn } from "@/lib/utils";

/**
 * Desktop header account control. Resolves the Firebase auth state on the
 * client (and keeps it live via `onAuthStateChanged`) so the shared layout
 * stays statically renderable — no `cookies()` in the server tree.
 *
 * Logged out → "Sign in" affordance with a sign-in / register panel.
 * Logged in  → avatar initials + a menu (account, orders, wishlist, sign out).
 */

const MENU_LINKS = [
  { label: "My Account", href: "/account", icon: LayoutDashboard },
  { label: "My Orders", href: "/account/orders", icon: Package },
  { label: "Wishlist", href: "/wishlist", icon: Heart },
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

export function AccountMenu() {
  const pathname = usePathname();
  const router = useRouter();
  // `undefined` while the first auth check is in flight, then `User | null`.
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const auth = firebaseAuth();
    if (!auth) {
      setUser(null);
      return;
    }
    try {
      return onAuthStateChanged(auth, (u) => setUser(u));
    } catch (err) {
      console.warn("Failed to attach auth state listener:", err);
      setUser(null);
    }
  }, []);

  // Close on route change.
  useEffect(() => setOpen(false), [pathname]);

  // Dismiss on outside click / Esc.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const loggedIn = Boolean(user);
  const fullName = user?.displayName ?? undefined;
  const label = fullName || user?.email?.split("@")[0] || "Account";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={loggedIn ? "Account menu" : "Sign in"}
        className="flex items-center gap-2 rounded-full p-1 text-neutral-700 transition-colors hover:bg-neutral-100 xl:pr-2.5"
      >
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold",
            loggedIn ? "bg-emerald-600 text-white" : "bg-neutral-100 text-neutral-600",
          )}
        >
          {loggedIn ? initials(fullName || user?.email || "A") : <UserIcon size={20} />}
        </span>
        <span className="hidden text-left leading-tight xl:block">
          <span className="block text-[11px] text-neutral-400">
            {loggedIn ? "Hello," : "Account"}
          </span>
          <span className="block max-w-[9rem] truncate text-[13px] font-semibold text-neutral-800">
            {loggedIn ? label : "Sign in"}
          </span>
        </span>
        <ChevronDown
          size={15}
          className={cn(
            "hidden shrink-0 text-neutral-400 transition-transform duration-200 xl:block",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl shadow-neutral-900/10"
        >
          {user === undefined ? (
            <div className="px-4 py-6 text-center text-sm text-neutral-400">Loading…</div>
          ) : loggedIn ? (
            <>
              <div className="border-b border-neutral-100 px-4 py-3">
                <p className="truncate text-sm font-semibold text-neutral-800">{label}</p>
                <p className="truncate text-xs text-neutral-400">{user?.email}</p>
              </div>
              <div className="py-1">
                {MENU_LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 transition-colors hover:bg-neutral-50"
                  >
                    <item.icon size={16} className="shrink-0 text-neutral-400" />
                    {item.label}
                  </Link>
                ))}
              </div>
              <div className="border-t border-neutral-100 py-1">
                <button
                  type="button"
                  role="menuitem"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await signOut();
                      router.push("/account");
                      router.refresh();
                    })
                  }
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  <LogOut size={16} className="shrink-0" />
                  {isPending ? "Signing out…" : "Sign out"}
                </button>
              </div>
            </>
          ) : (
            <div className="p-4">
              <p className="text-sm font-semibold text-neutral-800">Welcome to AmaaShop</p>
              <p className="mt-0.5 text-xs text-neutral-500">
                Sign in for faster checkout, order tracking and your wishlist.
              </p>
              <Link
                href="/signin"
                className="mt-3 block rounded-lg bg-emerald-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="mt-2 block rounded-lg border border-neutral-300 px-4 py-2.5 text-center text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                Create account
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
