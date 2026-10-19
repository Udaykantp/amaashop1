"use client";

import { KeyRound, LogIn, Snowflake, Trash2, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  deleteDistributorAction,
  sendPasswordResetAction,
  setMemberFrozenAction,
  startImpersonationAction,
  terminateMemberAction,
} from "@/actions/admin";
import type { DistributorDeletability } from "@/server/network/delete";
import { useAdminAction } from "@/components/admin/use-admin-action";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

type Caps = {
  freeze: boolean;
  terminate: boolean;
  impersonate: boolean;
  resetPw: boolean;
  delete: boolean;
};

export function MemberCompliancePanel({
  memberId,
  userId,
  memberCode,
  frozen,
  terminated,
  caps,
  deletability,
}: {
  memberId: string;
  userId: string;
  memberCode: string;
  frozen: boolean;
  terminated: boolean;
  caps: Caps;
  deletability: DistributorDeletability | null;
}) {
  const router = useRouter();
  const { pending, run } = useAdminAction();
  const [freezeReason, setFreezeReason] = useState("");
  const [termReason, setTermReason] = useState("");
  const [confirmTerm, setConfirmTerm] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  function onDelete() {
    setConfirmDeleteOpen(false);
    run(() => deleteDistributorAction(memberId), {
      successMessage: `${memberCode} was deleted.`,
      refresh: false,
      onSuccess: () => router.push("/admin/members"),
    });
  }

  const deleteBlock =
    caps.delete && deletability ? (
      <div
        className={`rounded-lg border p-3 ${
          deletability.deletable ? "border-destructive/40 bg-destructive/5" : ""
        }`}
      >
        <p
          className={`flex items-center gap-1.5 text-sm font-medium ${
            deletability.deletable ? "text-destructive" : ""
          }`}
        >
          <Trash2 className="h-4 w-4" /> Delete distributor
        </p>
        {deletability.deletable ? (
          <>
            <p className="mt-0.5 text-xs text-muted-foreground">
              No downline or earnings history is attached, so this is safe. Audit-logged.{" "}
              <strong>Cannot be undone.</strong>
            </p>
            <Button
              size="sm"
              variant="destructive"
              className="mt-2"
              disabled={pending}
              onClick={() => setConfirmDeleteOpen(true)}
            >
              Delete permanently
            </Button>
          </>
        ) : (
          <p className="mt-0.5 text-xs text-muted-foreground">
            This distributor has downline or earnings history. Use <strong>Terminate</strong> instead
            — it keeps the record and rolls their downline up to the next sponsor.
          </p>
        )}
      </div>
    ) : null;

  const deleteDialog = (
    <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {memberCode}?</DialogTitle>
          <DialogDescription>
            This permanently removes them and cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            type="button"
            onClick={() => setConfirmDeleteOpen(false)}
            className="inline-flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onDelete}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          >
            {pending ? <Spinner size="xs" /> : <Trash2 className="h-4 w-4" />}
            Delete distributor
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (terminated) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          This distributor is terminated. Their position has been closed up: their team moved up to
          fill it, and the slot they held is no longer theirs.
        </p>
        {deleteBlock}
        {deleteDialog}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {caps.impersonate ? (
          <form action={() => run(() => startImpersonationAction(userId), { refresh: false })}>
            <Button type="submit" size="sm" variant="outline" disabled={pending} className="gap-1.5">
              <LogIn className="h-4 w-4" /> Login as this distributor
            </Button>
          </form>
        ) : null}
        {caps.resetPw ? (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => sendPasswordResetAction(userId), { refresh: false })}
            className="gap-1.5"
          >
            <KeyRound className="h-4 w-4" /> Generate password reset
          </Button>
        ) : null}
      </div>

      {caps.freeze ? (
        <div className="rounded-lg border p-3">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Snowflake className="h-4 w-4" /> {frozen ? "Account frozen" : "Freeze account"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Freezing halts withdrawals and disables the referral link. The tree is untouched.
          </p>
          {frozen ? (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              className="mt-2"
              onClick={() => run(() => setMemberFrozenAction(memberId, false, ""))}
            >
              Lift freeze
            </Button>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Input
                value={freezeReason}
                onChange={(e) => setFreezeReason(e.target.value)}
                placeholder="Reason"
                className="h-8 w-56 text-xs"
              />
              <Button
                size="sm"
                variant="destructive"
                disabled={pending || freezeReason.trim().length < 4}
                onClick={() => run(() => setMemberFrozenAction(memberId, true, freezeReason))}
              >
                Freeze
              </Button>
            </div>
          )}
        </div>
      ) : null}

      {caps.terminate ? (
        <div className="rounded-lg border border-destructive/30 p-3">
          <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
            <UserX className="h-4 w-4" /> Terminate + close the gap
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Removes this distributor from the tree. One frontline member steps up into their slot; if
            they have two, the left one steps up and the right one (with their team) is placed in the
            first open slot inside the left team. Referral credit is unchanged. Requires 2FA.
            Audit-logged. Not reversible with one click.
          </p>
          {!confirmTerm ? (
            <Button
              size="sm"
              variant="destructive"
              className="mt-2"
              disabled={pending}
              onClick={() => setConfirmTerm(true)}
            >
              Terminate…
            </Button>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Input
                value={termReason}
                onChange={(e) => setTermReason(e.target.value)}
                placeholder="Reason for termination"
                className="h-8 w-64 text-xs"
              />
              <Button
                size="sm"
                variant="destructive"
                disabled={pending || termReason.trim().length < 4}
                onClick={() => run(() => terminateMemberAction(memberId, termReason))}
              >
                Confirm termination
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmTerm(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      ) : null}

      {deleteBlock}
      {deleteDialog}
    </div>
  );
}
