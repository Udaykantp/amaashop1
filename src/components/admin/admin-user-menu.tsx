"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { signOut } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export function AdminUserMenu({ email, role }: { email: string | null; role: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (!email) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="text-right leading-tight">
        <p className="text-sm font-medium text-foreground">{email}</p>
        <p className="text-xs text-muted-foreground">{role ?? ""}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await signOut();
            router.replace("/admin/signin");
            router.refresh();
          })
        }
        className="gap-1.5"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </div>
  );
}
