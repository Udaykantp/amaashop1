import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";
import { cn } from "@/lib/utils";

const SOCIALS = [
  { icon: Facebook, label: "Facebook" },
  { icon: Twitter, label: "Twitter" },
  { icon: Instagram, label: "Instagram" },
  { icon: Youtube, label: "YouTube" },
] as const;

export function SocialLinks({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("flex gap-3", compact && "gap-2")}>
      {SOCIALS.map(({ icon: Icon, label }) => (
        <a
          key={label}
          href="#"
          className={cn(
            "flex items-center justify-center rounded-full bg-neutral-800 text-neutral-400 transition-colors hover:bg-emerald-500 hover:text-white",
            compact ? "h-8 w-8" : "h-9 w-9",
          )}
          aria-label={label}
        >
          <Icon size={compact ? 14 : 16} />
        </a>
      ))}
    </div>
  );
}
