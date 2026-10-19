"use client";

import { useState } from "react";
import { approveKycAction, rejectKycAction } from "@/actions/admin";
import { useAdminAction } from "@/components/admin/use-admin-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function KycReviewActions({ userId }: { userId: string }) {
  const { pending, run } = useAdminAction();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <div className="flex flex-col items-end gap-1.5">
      {rejecting ? (
        <div className="flex items-center gap-2">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for rejection"
            className="h-8 w-56 text-xs"
          />
          <Button
            size="sm"
            variant="destructive"
            disabled={pending || reason.trim().length < 4}
            onClick={() => run(() => rejectKycAction(userId, reason))}
          >
            Confirm reject
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button size="sm" disabled={pending} onClick={() => run(() => approveKycAction(userId))}>
            Approve
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => setRejecting(true)}>
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
