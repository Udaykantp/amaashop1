"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { MemberApplicationStatus } from "@/server/enums";
import {
  approveApplicationAction,
  holdApplicationAction,
  rejectApplicationAction,
  reopenApplicationAction,
  type ApplicationActionResult,
} from "@/actions/admin-applications";
import { useAdminToast } from "@/components/admin/admin-toast-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

type Mode = "approve" | "hold" | "reject" | "reopen";

export function ApplicationReviewPanel({
  id,
  sponsorCode,
  requestedSide,
  canApprove,
  status,
  hasMember,
}: {
  id: string;
  sponsorCode: string | null;
  /** Side of the sponsor's tree the applicant's invite link asked for, if any. */
  requestedSide: "LEFT" | "RIGHT" | null;
  canApprove: boolean;
  status: MemberApplicationStatus;
  hasMember: boolean;
}) {
  const router = useRouter();
  const toast = useAdminToast();
  const [pending, start] = useTransition();
  const decided = status === "REJECTED";
  const [mode, setMode] = useState<Mode>(decided ? "reopen" : "approve");
  const [note, setNote] = useState("");
  const [side, setSide] = useState<"AUTO" | "LEFT" | "RIGHT">(requestedSide ?? "AUTO");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Extract<ApplicationActionResult, { ok: true }> | null>(null);
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);

  const modes: Mode[] = decided ? ["reopen"] : ["approve", "hold", "reject"];
  const needsReason = mode !== "approve";

  function execute() {
    start(async () => {
      const res =
        mode === "approve"
          ? await approveApplicationAction(id, note.trim() || undefined, side)
          : mode === "hold"
            ? await holdApplicationAction(id, note.trim())
            : mode === "reject"
              ? await rejectApplicationAction(id, note.trim())
              : await reopenApplicationAction(id, note.trim());

      if (res.ok) {
        setDone(res);
        router.refresh();
        toast.show(res.message ?? "Done.", "success");
      } else {
        setError(res.error);
        toast.show(res.error ?? "Something went wrong. Please try again.", "error");
      }
    });
  }

  function run() {
    setError(null);
    if (mode === "approve" && !sponsorCode) {
      setError("This application has no resolved sponsor — it can't be approved.");
      return;
    }
    if (needsReason && note.trim().length < 4) {
      setError("Add a short reason (min 4 characters).");
      return;
    }
    if (mode === "approve") {
      setConfirmApproveOpen(true);
      return;
    }
    execute();
  }

  function confirmApprove() {
    setConfirmApproveOpen(false);
    execute();
  }

  if (done) {
    return (
      <div className="space-y-3 rounded-lg border border-success/40 bg-success/5 p-4 text-sm">
        <p className="font-medium text-foreground">{done.message}</p>
        {done.signInLink ? (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              New account — share this one-time link so they can set a password:
            </p>
            <p className="break-all rounded-md border bg-card px-3 py-2 font-mono text-xs">
              {done.signInLink}
            </p>
          </div>
        ) : null}
        {done.memberId ? (
          <Link href={`/admin/members/${done.memberId}`}>
            <Button size="sm">Open distributor profile</Button>
          </Link>
        ) : null}
      </div>
    );
  }

  if (status === "APPROVED" || hasMember) {
    return (
      <p className="text-sm text-muted-foreground">
        This application is approved and the distributor account has been created. It can&rsquo;t be
        changed from here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {modes.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            disabled={m === "approve" && !canApprove}
            className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              mode === m
                ? "bg-primary text-primary-foreground"
                : "border hover:bg-secondary disabled:opacity-40"
            }`}
          >
            {m === "reopen" ? "Reopen" : m}
          </button>
        ))}
      </div>

      {mode === "approve" ? (
        <div className="space-y-1.5">
          <Label htmlFor="placeSide">Place on</Label>
          <select
            id="placeSide"
            value={side}
            onChange={(e) => setSide(e.target.value as "AUTO" | "LEFT" | "RIGHT")}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="AUTO">Auto — sponsor&rsquo;s weaker leg</option>
            <option value="LEFT">Left leg</option>
            <option value="RIGHT">Right leg</option>
          </select>
          <p className="text-xs text-muted-foreground">
            {requestedSide
              ? `Their invite link asked for the ${requestedSide === "LEFT" ? "left" : "right"} leg. `
              : "Their invite link didn't ask for a side. "}
            If that spot under the sponsor is taken they go to the first open slot below it; the sponsor keeps
            the referral credit either way.
          </p>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="reviewNote">{needsReason ? "Reason" : "Note (optional)"}</Label>
        <textarea
          id="reviewNote"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={500}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder={
            mode === "approve"
              ? "Anything the team should know…"
              : mode === "reopen"
                ? "Why is this being sent back to the pending queue?"
                : "Why is this application being held / rejected?"
          }
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {mode === "approve" && !canApprove ? (
        <p className="text-xs text-muted-foreground">
          Approving needs the <code>application.review</code> permission with two-factor sign-in.
        </p>
      ) : null}

      <Button onClick={run} disabled={pending || (mode === "approve" && !canApprove)}>
        {pending
          ? "Working…"
          : mode === "approve"
            ? "Approve & create distributor"
            : mode === "hold"
              ? "Put on hold"
              : mode === "reject"
                ? "Reject application"
                : "Reopen application"}
      </Button>

      <Dialog open={confirmApproveOpen} onOpenChange={setConfirmApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve this application?</DialogTitle>
            <DialogDescription>
              This creates a distributor account referred by {sponsorCode} and places them on the{" "}
              {side === "AUTO" ? "weaker" : side === "LEFT" ? "left" : "right"} leg of their team.
              It can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmApproveOpen(false)}
              className="inline-flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={confirmApprove}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {pending ? <Spinner size="xs" /> : null}
              Approve & create distributor
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
