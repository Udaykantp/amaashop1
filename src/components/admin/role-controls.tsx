"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { UserRole } from "@/server/enums";
import { setUserRoleAction, setUserStatusAction } from "@/actions/admin";
import { useAdminToast } from "@/components/admin/admin-toast-provider";
import { ROLE_LABEL } from "@/server/rbac";

const ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "OPS_ADMIN",
  "FINANCE_ADMIN",
  "STORE_MANAGER",
  "SUPPORT_COMPLIANCE",
  "MEMBER",
  "CONSUMER",
];

export function RoleControls({
  userId,
  role,
  status,
  isSelf,
}: {
  userId: string;
  role: UserRole;
  status: "ACTIVE" | "SUSPENDED" | "CLOSED";
  isSelf: boolean;
}) {
  const router = useRouter();
  const toast = useAdminToast();
  const [pending, start] = useTransition();
  const [currentRole, setCurrentRole] = useState(role);
  const [currentStatus, setCurrentStatus] = useState(status);

  if (isSelf) return <span className="text-xs text-muted-foreground">You</span>;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Role"
          value={currentRole}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.value as UserRole;
            const prev = currentRole;
            setCurrentRole(next);
            start(async () => {
              const res = await setUserRoleAction(userId, next);
              if (res.ok) {
                toast.show(res.message ?? "Role updated.", "success");
                router.refresh();
              } else {
                setCurrentRole(prev);
                toast.show(res.error, "error");
              }
            });
          }}
          className="h-8 rounded-md border bg-background px-2 text-xs"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const next = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
            const prev = currentStatus;
            setCurrentStatus(next);
            start(async () => {
              const res = await setUserStatusAction(userId, next);
              if (res.ok) {
                toast.show(res.message ?? "Status updated.", "success");
                router.refresh();
              } else {
                setCurrentStatus(prev);
                toast.show(res.error, "error");
              }
            });
          }}
          className="h-8 rounded-md border px-2 text-xs hover:bg-secondary disabled:opacity-50"
        >
          {currentStatus === "ACTIVE" ? "Suspend" : "Reactivate"}
        </button>
      </div>
    </div>
  );
}
