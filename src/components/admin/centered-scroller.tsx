"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * A horizontally scrollable box that opens scrolled to its middle — a wide
 * genealogy chart has its root at the centre, so starting at the left edge would
 * hide it.
 */
export function CenteredScroller({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2);
  }, []);
  return (
    <div ref={ref} className={cn("overflow-x-auto", className)}>
      {children}
    </div>
  );
}
