import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const spinnerVariants = cva("animate-spin", {
  variants: {
    size: {
      xs: "h-3.5 w-3.5",
      sm: "h-4 w-4",
      default: "h-6 w-6",
      lg: "h-9 w-9",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

export interface SpinnerProps
  extends React.SVGAttributes<SVGSVGElement>,
    VariantProps<typeof spinnerVariants> {
  /** Visually-hidden label for screen readers (this is a status indicator, not decorative). */
  label?: string;
}

/**
 * Small circular loading indicator — a faint full-circle track plus a solid
 * quarter-arc that spins, the same two-layer construction premium UIs
 * (Stripe, GitHub, Linear) use so the motion reads as smooth rotation rather
 * than a blinking dash. Inherits `currentColor`, so it recolors with
 * whatever text color context it's placed in (a button's foreground, the
 * admin workspace accent, etc.) — never hard-code a color on it directly.
 */
export function Spinner({ className, size, label = "Loading", ...props }: SpinnerProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label={label}
      className={cn(spinnerVariants({ size }), className)}
      {...props}
    >
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="2.5" className="opacity-20" />
      <path
        d="M21.5 12a9.5 9.5 0 0 0-9.5-9.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
