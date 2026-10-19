import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Two-factor required" };
export const dynamic = "force-dynamic";

export default function VerifyPage() {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-card">
      <h1 className="font-serif text-xl font-medium">Two-factor authentication required</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The admin console requires a second factor (TOTP). Enrolment UI ships in Phase 7. For local
        development, set <code className="rounded bg-muted px-1">ADMIN_MFA_OPTIONAL=true</code> in{" "}
        <code className="rounded bg-muted px-1">.env.local</code> (never in production), or ask a
        Super Admin to set the <code className="rounded bg-muted px-1">mfa</code> claim on your
        account.
      </p>
      <Button asChild variant="outline" className="mt-5">
        <Link href="/admin/signin">Back to sign in</Link>
      </Button>
    </div>
  );
}
