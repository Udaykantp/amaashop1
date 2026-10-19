"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { moveMemberAction } from "@/actions/admin";
import { useAdminToast } from "@/components/admin/admin-toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Leg = "LEFT" | "RIGHT";
const legName = (l: Leg) => (l === "LEFT" ? "left" : "right");

/**
 * Manual node placement (RBAC spec §3). Two-step: enter the new parent and which
 * side, then an explicit confirm that spells out exactly what moves. The target
 * slot must be empty. The server action enforces a real second factor and writes
 * an immutable audit row.
 */
export function MoveNodeTool({
  member,
  currentParentCode,
  currentLeg,
  teamSize,
  canMove,
}: {
  member: { id: string; code: string; name: string | null };
  /** Who they sit directly under today; null for the root of the network. */
  currentParentCode: string | null;
  currentLeg: Leg | null;
  /** Members below them who move with them. */
  teamSize: number;
  canMove: boolean;
}) {
  const router = useRouter();
  const toast = useAdminToast();
  const [pending, start] = useTransition();
  const [parent, setParent] = useState("");
  const [leg, setLeg] = useState<Leg>("LEFT");
  const [confirming, setConfirming] = useState(false);

  if (!canMove) {
    return (
      <p className="text-sm text-muted-foreground">
        You have view access to the genealogy but not the <code className="rounded bg-muted px-1">network.move</code>{" "}
        permission needed to re-place a distributor.
      </p>
    );
  }

  if (!currentParentCode) {
    return (
      <p className="text-sm text-muted-foreground">
        This is the top of the network — it has no position to move from. Search for someone further down to re-place them.
      </p>
    );
  }

  function submit() {
    start(async () => {
      const res = await moveMemberAction(member.id, parent.trim(), leg);
      if (res.ok) {
        toast.show(res.message ?? "Moved.", "success");
        setConfirming(false);
        setParent("");
        router.refresh();
      } else {
        toast.show(res.error, "error");
        setConfirming(false);
      }
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-warning/40 bg-warning/5 p-4">
      <div>
        <p className="text-sm font-medium text-foreground">Move this distributor to a different position</p>
        <p className="text-xs text-muted-foreground">
          Re-places <span className="font-mono">{member.code}</span>
          {teamSize > 0 ? ` and their team of ${teamSize}` : ""} into an <strong>empty</strong> left or right slot under
          another distributor. Their referral sponsor does not change. Requires 2FA; logged to the audit trail.
        </p>
      </div>

      {!confirming ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="newParent" className="text-xs">
              New parent — mobile or AMA code
            </Label>
            <Input
              id="newParent"
              value={parent}
              onChange={(e) => setParent(e.target.value.toUpperCase())}
              placeholder="9876543210  or  AMA-XXXXXX"
              className="h-9 w-60 font-mono text-sm"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="newLeg" className="text-xs">
              Side
            </Label>
            <select
              id="newLeg"
              value={leg}
              onChange={(e) => setLeg(e.target.value as Leg)}
              className="flex h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="LEFT">Left</option>
              <option value="RIGHT">Right</option>
            </select>
          </div>
          <Button size="sm" disabled={pending || parent.trim().length < 3} onClick={() => setConfirming(true)}>
            Review move
          </Button>
        </div>
      ) : (
        <div className="space-y-2 rounded-md border bg-card p-3 text-sm">
          <p>
            <span className="text-muted-foreground">Distributor:</span>{" "}
            <span className="font-mono">{member.code}</span> {member.name ? `(${member.name})` : ""}
          </p>
          <p>
            <span className="text-muted-foreground">From:</span>{" "}
            <span className="font-mono">{currentParentCode}</span>
            {currentLeg ? ` · ${legName(currentLeg)} leg` : ""}
          </p>
          <p>
            <span className="text-muted-foreground">To:</span> <span className="font-mono">{parent.trim()}</span> ·{" "}
            {legName(leg)} leg
          </p>
          <p className="text-xs text-muted-foreground">
            {teamSize} team member(s) move with them; leg totals and weaker-leg volume recalculate for both the old and
            the new upline.
          </p>
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="destructive" disabled={pending} onClick={submit}>
              {pending ? "Moving…" : "Confirm move"}
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
