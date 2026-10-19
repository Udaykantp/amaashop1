"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createCommissionRuleVersionAction } from "@/actions/admin";
import { useAdminToast } from "@/components/admin/admin-toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CommissionVersionForm({ currentJson }: { currentJson: string }) {
  const router = useRouter();
  const toast = useAdminToast();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        Create a new version
      </Button>
    );
  }

  return (
    <form
      className="space-y-4 rounded-xl border bg-card p-5 shadow-card"
      action={(fd) => {
        setMsg(null);
        start(async () => {
          const res = await createCommissionRuleVersionAction(fd);
          if (res.ok) {
            toast.show(res.message ?? "New commission rule version activated.", "success");
            setOpen(false);
            router.refresh();
          } else {
            setMsg({ tone: "err", text: res.error });
            toast.show(res.error, "error");
          }
        });
      }}
    >
      <div>
        <h3 className="font-serif text-base font-medium">New commission rule version</h3>
        <p className="text-sm text-muted-foreground">
          The current version is closed off at the effective date below and archived. Past payouts
          stay bound to the version that was active when their order confirmed.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Version name</Label>
          <Input id="name" name="name" required placeholder="e.g. Confirmed launch plan" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="effectiveFrom">Effective from</Label>
          <Input id="effectiveFrom" name="effectiveFrom" type="datetime-local" required />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ruleJson">Rule JSON</Label>
        <textarea
          id="ruleJson"
          name="ruleJson"
          rows={18}
          defaultValue={currentJson}
          spellCheck={false}
          className="w-full rounded-md border bg-muted/30 p-3 font-mono text-xs leading-relaxed"
        />
        <p className="text-xs text-muted-foreground">Shape reference: docs/COMMISSION-PLAN.md §1</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="note">Note (optional)</Label>
        <Input id="note" name="note" placeholder="What changed and why" />
      </div>

      {msg ? (
        <p className={msg.tone === "ok" ? "text-sm text-success" : "text-sm text-destructive"}>{msg.text}</p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Activate new version"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
