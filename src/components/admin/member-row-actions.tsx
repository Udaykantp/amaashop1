"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteDistributorAction } from "@/actions/admin";
import { useAdminAction } from "@/components/admin/use-admin-action";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Per-row delete for the Members & network list. One click + a confirm. The
 * server only allows deleting a distributor with no downline and no earnings
 * history (a mistaken enrolment); anything else comes back with a message
 * pointing to Terminate on the member's page.
 */
export function MemberRowActions({
  memberId,
  memberCode,
  name,
  directCount,
}: {
  memberId: string;
  memberCode: string;
  name: string;
  directCount: number;
}) {
  const { pending, run } = useAdminAction();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function confirmDelete() {
    setConfirmOpen(false);
    run(() => deleteDistributorAction(memberId), { successMessage: `${name} was deleted.` });
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 gap-1.5 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
        disabled={pending}
        onClick={() => setConfirmOpen(true)}
        aria-label={`Delete ${memberCode}`}
      >
        {pending ? <Spinner size="xs" /> : <Trash2 className="h-4 w-4" />}
        Delete
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {memberCode}?</DialogTitle>
            <DialogDescription>
              {name} will be permanently removed. This cannot be undone.
              {directCount > 0
                ? ` They have ${directCount} direct referral${directCount === 1 ? "" : "s"} and probably can't be deleted — use Terminate instead.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="inline-flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={confirmDelete}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {pending ? <Spinner size="xs" /> : <Trash2 className="h-4 w-4" />}
              Delete distributor
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
