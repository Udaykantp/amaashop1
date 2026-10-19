import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminToastProvider } from "@/components/admin/admin-toast-provider";
import { AdminUserMenu } from "@/components/admin/admin-user-menu";
import { ADMIN_WORKSPACE_COOKIE, parseWorkspace } from "@/lib/admin/workspace";
import { getCurrentUser } from "@/server/auth/session";
import {
  effectiveCapabilities,
  isAdminRole,
  isUnauthorizedSuperAdmin,
  ROLE_LABEL,
} from "@/server/rbac";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · AmaaShop Admin" },
  robots: { index: false, follow: false },
};

/**
 * Admin console shell — separate from storefront + member chrome. Each page
 * still enforces its own capability/role guard; this layout paints the frame
 * and hides nav sections the signed-in admin can't use.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser().catch(() => null);
  const isAdmin =
    user && isAdminRole(user.role) && !isUnauthorizedSuperAdmin(user) && !user.impersonatedBy;

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-sm animate-page-enter">
          <Link href="/admin" className="mb-6 flex items-center justify-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              A
            </span>
            <span className="font-serif text-lg font-medium">AmaaShop</span>
            <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
              Admin
            </span>
          </Link>
          {children}
        </div>
      </div>
    );
  }

  const caps = [...effectiveCapabilities(user)];
  const workspace = parseWorkspace((await cookies()).get(ADMIN_WORKSPACE_COOKIE)?.value);

  return (
    <AdminToastProvider>
    <div
      data-admin-shell
      data-admin-ws={workspace}
      className="min-h-screen bg-[hsl(var(--ws-soft))] transition-colors duration-300"
    >
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r-2 border-r-[hsl(var(--ws-line))] bg-card transition-colors duration-300 lg:flex">
          <Link href="/admin" className="flex h-14 items-center gap-2 border-b px-5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              A
            </span>
            <span className="font-serif text-base font-medium">AmaaShop</span>
            <span className="rounded bg-[hsl(var(--ws-soft))] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--ws))] transition-colors duration-300">
              Admin
            </span>
          </Link>
          <AdminNav capabilities={caps} initialWorkspace={workspace} />
          <div className="border-t p-3 text-[10px] text-muted-foreground">
            {ROLE_LABEL[user.role]}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b-2 border-b-[hsl(var(--ws-line))] bg-card/80 px-5 backdrop-blur transition-colors duration-300">
            <Link href="/admin" className="font-serif text-base font-medium lg:hidden">
              AmaaShop <span className="text-[hsl(var(--ws))]">Admin</span>
            </Link>
            <div className="hidden lg:block" />
            <AdminUserMenu email={user.email} role={ROLE_LABEL[user.role]} />
          </header>

          <main className="min-w-0 flex-1 p-5 lg:p-8">
            <div className="mx-auto max-w-6xl animate-page-enter">{children}</div>
          </main>
        </div>
      </div>
    </div>
    </AdminToastProvider>
  );
}
