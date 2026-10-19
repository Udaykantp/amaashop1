"use client";

import { ArrowUp } from "lucide-react";

export function BackToTopButton() {
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-neutral-400 transition-colors hover:border-emerald-400 hover:text-emerald-400"
      aria-label="Back to top"
    >
      <ArrowUp size={16} />
    </button>
  );
}
