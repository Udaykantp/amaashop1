import { CheckCircle2, CreditCard, MapPin, Shield, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

export type CheckoutStep = "address" | "delivery" | "payment" | "review";

export const CHECKOUT_STEPS: { key: CheckoutStep; label: string; icon: typeof MapPin }[] = [
  { key: "address", label: "Address", icon: MapPin },
  { key: "delivery", label: "Delivery", icon: Truck },
  { key: "payment", label: "Payment", icon: CreditCard },
  { key: "review", label: "Review", icon: Shield },
];

export function CheckoutStepper({ currentStepIndex }: { currentStepIndex: number }) {
  return (
    <div className="mt-4 flex items-center justify-between px-3 lg:mx-0 lg:max-w-2xl lg:px-0">
      {CHECKOUT_STEPS.map((s, i) => (
        <div key={s.key} className="flex flex-1 items-center">
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-colors lg:h-10 lg:w-10 lg:text-sm",
                i <= currentStepIndex ? "bg-emerald-500 text-white" : "bg-neutral-100 text-neutral-400",
              )}
            >
              {i < currentStepIndex ? <CheckCircle2 size={18} /> : <s.icon size={18} />}
            </div>
            <span className={cn("text-[10px] font-medium lg:text-xs", i <= currentStepIndex ? "text-emerald-600" : "text-neutral-400")}>
              {s.label}
            </span>
          </div>
          {i < CHECKOUT_STEPS.length - 1 && (
            <div className={cn("mx-1 h-0.5 flex-1 rounded transition-colors", i < currentStepIndex ? "bg-emerald-500" : "bg-neutral-100")} />
          )}
        </div>
      ))}
    </div>
  );
}
