import type { MemberApplicationSource, MemberApplicationStatus } from "@/server/enums";
import { cn } from "@/lib/utils";

const STYLE: Record<MemberApplicationStatus, string> = {
  PENDING: "bg-warning/10 text-warning",
  ON_HOLD: "bg-muted text-muted-foreground",
  APPROVED: "bg-success/10 text-success",
  REJECTED: "bg-destructive/10 text-destructive",
};

const LABEL: Record<MemberApplicationStatus, string> = {
  PENDING: "Pending",
  ON_HOLD: "On hold",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export function ApplicationStatus({ value }: { value: MemberApplicationStatus }) {
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium",
        STYLE[value],
      )}
    >
      {LABEL[value]}
    </span>
  );
}

const SOURCE_LABEL: Record<MemberApplicationSource, string> = {
  PUBLIC: "Public form",
  ADMIN: "Added by admin",
};

export function ApplicationSourceBadge({ value }: { value: MemberApplicationSource }) {
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-medium",
        value === "ADMIN"
          ? "border-primary/30 bg-primary/5 text-primary"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      {SOURCE_LABEL[value]}
    </span>
  );
}
