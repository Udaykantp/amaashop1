"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { loadDownlineLevelAction, type DownlineRowDTO } from "@/actions/network";
import { MoneyAmount } from "@/components/patterns/money-amount";
import { formatRelativeTime } from "@/lib/member/time";
import { cn } from "@/lib/utils";
import type { NetworkLevelRow } from "@/server/member/preview-data";

/**
 * Genealogy SUMMARY view (brief §5.4): per-level counts + earnings in one
 * glance, each row tap-to-expand to that level's members. Never a raw 20-deep
 * tree render.
 */
export function NetworkLevels({ levels }: { levels: NetworkLevelRow[] }) {
  if (levels.length === 0) return null;
  return (
    <ul className="divide-y rounded-xl border bg-card shadow-card">
      {levels.map((row) => (
        <LevelRow key={row.level} row={row} />
      ))}
    </ul>
  );
}

function LevelRow({ row }: { row: NetworkLevelRow }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<DownlineRowDTO[] | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && rows === null) {
      startTransition(async () => setRows(await loadDownlineLevelAction(row.level)));
    }
  }

  return (
    <li>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/50"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {row.level}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">
            Level {row.level} — {row.members} {row.members === 1 ? "person" : "people"}
          </span>
          <span className="block text-xs text-muted-foreground">
            {row.active} active · earned <MoneyAmount value={row.earned} size="sm" tone="muted" />
          </span>
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="border-t bg-secondary/20 px-4 py-2">
          {pending && rows === null ? (
            <p className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : rows && rows.length > 0 ? (
            <ul className="divide-y divide-border/60">
              {rows.map((m) => (
                <li key={m.memberProfileId} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.memberCode} · joined {formatRelativeTime(m.joinedAt)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium",
                      m.status === "ACTIVE"
                        ? "bg-success/10 text-success"
                        : "bg-warning/10 text-warning",
                    )}
                  >
                    {m.status === "ACTIVE" ? "Active" : "KYC pending"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-3 text-sm text-muted-foreground">No members at this level yet.</p>
          )}
        </div>
      ) : null}
    </li>
  );
}
