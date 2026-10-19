import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signOutAndReturn } from "@/app/admin/no-access/actions";

export const metadata = { title: "No access" };
export const dynamic = "force-dynamic";

export default function NoAccessPage() {
  return (
    <div className="rounded-xl border bg-card p-6 text-center shadow-card">
      <h1 className="font-serif text-xl font-medium">You don’t have admin access</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This account isn’t authorised for the console. If you think that’s wrong, ask a Super Admin to
        grant you a role.
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Button asChild variant="outline">
          <Link href="/">Go to the store</Link>
        </Button>
        <form action={signOutAndReturn}>
          <Button type="submit">Sign in as someone else</Button>
        </form>
      </div>
    </div>
  );
}
