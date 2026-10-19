import { CheckCircle2, Home, Package, Truck, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Order } from "@/lib/types";

const TRACKING_STEPS = [
  { status: "pending", label: "Order Confirmed", icon: CheckCircle2 },
  { status: "processing", label: "Packed", icon: Package },
  { status: "shipped", label: "Shipped", icon: Truck },
  { status: "delivered", label: "Delivered", icon: Home },
] as const;

export function OrderTrackingTimeline({ status }: { status: Order["status"] }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-red-700">
        <XCircle size={24} />
        <div>
          <p className="text-sm font-semibold">This order was cancelled</p>
          <p className="text-xs text-red-600">Contact support if you have questions about this order.</p>
        </div>
      </div>
    );
  }

  const currentStepIndex = TRACKING_STEPS.findIndex((s) => s.status === status);

  return (
    <div className="space-y-0">
      {TRACKING_STEPS.map((step, i) => {
        const isComplete = i <= currentStepIndex;
        const isCurrent = i === currentStepIndex;
        return (
          <div key={step.status} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                  isComplete ? "bg-emerald-500 text-white" : "bg-neutral-100 text-neutral-400",
                  isCurrent && "ring-4 ring-emerald-100",
                )}
              >
                <step.icon size={20} />
              </div>
              {i < TRACKING_STEPS.length - 1 && (
                <div className={cn("h-8 w-0.5", i < currentStepIndex ? "bg-emerald-500" : "bg-neutral-100")} />
              )}
            </div>
            <div className="pb-6">
              <p className={cn("text-sm font-semibold", isComplete ? "text-neutral-800" : "text-neutral-400")}>{step.label}</p>
              {isCurrent && <p className="text-xs text-emerald-600">Expected: 2-3 business days</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
