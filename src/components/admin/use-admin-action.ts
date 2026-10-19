"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useAdminToast } from "@/components/admin/admin-toast-provider";

export interface AdminActionResult {
  ok: boolean;
  error?: string;
  message?: string;
}

export interface RunOptions<T extends AdminActionResult> {
  /** Called with the result when `ok` is true — e.g. to populate a success card. */
  onSuccess?: (res: T) => void;
  /** Overrides `res.message` in the success toast. */
  successMessage?: string;
  /** Set false to skip `router.refresh()` (e.g. the action already navigated away). */
  refresh?: boolean;
  /** Set false to suppress the success toast entirely (rare — prefer always showing one). */
  toastOnSuccess?: boolean;
}

/**
 * Shared plumbing behind every admin "Save changes" / approve / delete style
 * button: a pending transition plus a toast on both outcomes, so no admin
 * action silently succeeds or fails with only an easy-to-miss inline string.
 * `router.refresh()` runs by default on success since almost every action
 * result feeds a server-rendered list/detail that needs the fresh data.
 */
export function useAdminAction() {
  const toast = useAdminToast();
  const router = useRouter();
  const [pending, start] = useTransition();

  function run<T extends AdminActionResult>(fn: () => Promise<T>, opts: RunOptions<T> = {}) {
    start(async () => {
      const res = await fn();
      if (res.ok) {
        if (opts.refresh !== false) router.refresh();
        if (opts.toastOnSuccess !== false) {
          toast.show(opts.successMessage ?? res.message ?? "Saved.", "success");
        }
        opts.onSuccess?.(res);
      } else {
        toast.show(res.error ?? "Something went wrong. Please try again.", "error");
      }
    });
  }

  return { pending, run };
}
