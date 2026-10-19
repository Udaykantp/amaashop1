"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { signOut } from "@/lib/auth/client";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await signOut();
          router.push("/account");
          router.refresh();
        })
      }
      disabled={isPending}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:border-red-200 hover:bg-red-50 disabled:opacity-50 sm:w-auto"
    >
      <LogOut size={16} />
      {isPending ? "Signing out..." : "Logout"}
    </button>
  );
}
