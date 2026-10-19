import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  ACTIVE: "bg-success/10 text-success",
  APPROVED: "bg-success/10 text-success",
  PENDING_KYC: "bg-warning/10 text-warning",
  SUBMITTED: "bg-warning/10 text-warning",
  UNDER_REVIEW: "bg-warning/10 text-warning",
  NOT_SUBMITTED: "bg-muted text-muted-foreground",
  SUSPENDED: "bg-destructive/10 text-destructive",
  TERMINATED: "bg-destructive/10 text-destructive",
  REJECTED: "bg-destructive/10 text-destructive",
  CLOSED: "bg-destructive/10 text-destructive",
  // order lifecycle
  PENDING: "bg-warning/10 text-warning",
  CONFIRMED: "bg-success/10 text-success",
  PROCESSING: "bg-warning/10 text-warning",
  SHIPPED: "bg-success/10 text-success",
  DELIVERED: "bg-success/10 text-success",
  CANCELLED: "bg-destructive/10 text-destructive",
  REFUNDED: "bg-destructive/10 text-destructive",
  // payments
  CREATED: "bg-muted text-muted-foreground",
  AUTHORIZED: "bg-warning/10 text-warning",
  CAPTURED: "bg-success/10 text-success",
  FAILED: "bg-destructive/10 text-destructive",
};

const LABEL: Record<string, string> = {
  ACTIVE: "Active",
  PENDING_KYC: "KYC pending",
  SUSPENDED: "Suspended",
  TERMINATED: "Terminated",
  CLOSED: "Closed",
  NOT_SUBMITTED: "No KYC",
  SUBMITTED: "KYC submitted",
  UNDER_REVIEW: "KYC in review",
  APPROVED: "KYC approved",
  REJECTED: "KYC rejected",
  // order lifecycle
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
  // payments
  CREATED: "Payment initiated",
  AUTHORIZED: "Authorized",
  CAPTURED: "Paid",
  FAILED: "Payment failed",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium",
        TONE[value] ?? "bg-muted text-muted-foreground",
      )}
    >
      {LABEL[value] ?? value}
    </span>
  );
}
