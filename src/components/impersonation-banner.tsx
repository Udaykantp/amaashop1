import { Eye } from "lucide-react";
import { stopImpersonationAction } from "@/actions/admin";
import { getCurrentUser } from "@/server/auth/session";

/**
 * Shown across the top of any page while a Super Admin is viewing the app AS a
 * distributor ("Login As"). Always offers a one-click way back.
 */
export async function ImpersonationBanner() {
  const user = await getCurrentUser().catch(() => null);
  if (!user?.impersonatedBy) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-accent px-4 py-1.5 text-center text-sm font-medium text-accent-foreground">
      <Eye className="h-4 w-4" aria-hidden />
      <span>
        Viewing as <strong>{user.email ?? user.displayName ?? "distributor"}</strong> — signed in as{" "}
        {user.impersonatedBy.email}
      </span>
      <form action={stopImpersonationAction}>
        <button type="submit" className="rounded bg-accent-foreground/10 px-2 py-0.5 text-xs font-semibold underline">
          Stop
        </button>
      </form>
    </div>
  );
}
