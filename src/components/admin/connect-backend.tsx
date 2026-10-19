import { Database } from "lucide-react";
import { PageHeader } from "@/components/patterns/page-header";

/** Shown on admin pages when Firebase isn't wired up yet. */
export function ConnectBackend({ missing }: { missing: string[] }) {
  return (
    <>
      <PageHeader title="Admin console" description="Connect Firebase to use the console." />
      <div className="rounded-xl border bg-card p-6 shadow-card">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <Database className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="font-medium text-foreground">Backend not connected</p>
            <p className="text-sm text-muted-foreground">
              Missing: {missing.join(", ")}
            </p>
          </div>
        </div>
        <ol className="mt-5 space-y-2 text-sm text-muted-foreground">
          <li>
            1. Put a real <code className="rounded bg-muted px-1">FIREBASE_SERVICE_ACCOUNT_JSON</code>{" "}
            in <code className="rounded bg-muted px-1">.env.local</code> (or run{" "}
            <code className="rounded bg-muted px-1">npm run emulators</code> for local Auth + Firestore
            emulators instead).
          </li>
          <li>
            2. <code className="rounded bg-muted px-1">npm run db:seed</code> to create the base
            categories, commission rule set, and (locally) demo accounts.
          </li>
          <li>3. Reload — sign in with the seeded Super Admin account.</li>
        </ol>
        <p className="mt-4 text-xs text-muted-foreground">Full steps: docs/SETUP.md</p>
      </div>
    </>
  );
}
