import { AlertTriangle } from "lucide-react";

/**
 * Dev-only banner shown when the new stack (Cloud SQL / Firebase) isn't
 * configured yet, so `npm run dev` still renders the member portal with empty
 * data instead of crashing. Never rendered in production.
 */
export function SetupNotice({ missing }: { missing: string[] }) {
  if (process.env.NODE_ENV === "production" || missing.length === 0) return null;
  return (
    <div className="mb-5 flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
      <div>
        <p className="font-medium text-foreground">Preview mode — backend not connected</p>
        <p className="mt-0.5 text-muted-foreground">
          Set {missing.map((m) => <code key={m} className="rounded bg-muted px-1">{m}</code>).reduce((a, b) => (
            <>{a}, {b}</>
          ))}{" "}
          in <code className="rounded bg-muted px-1">.env.local</code>, then run{" "}
          <code className="rounded bg-muted px-1">npm run db:seed</code>. Screens below show
          placeholder data until then.
        </p>
      </div>
    </div>
  );
}
