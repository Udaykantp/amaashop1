"use client";

import { ExternalLink, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import type { Retailer } from "@/server/enums";
import { setAffiliateLinksAction } from "@/actions/catalog";
import { useAdminToast } from "@/components/admin/admin-toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Row = { retailer: Retailer; url: string; enabled: boolean; clicks: number };

const NAME: Record<Retailer, string> = {
  AMAZON: "Amazon",
  FLIPKART: "Flipkart",
  JIOMART: "JioMart",
};
const PLACEHOLDER: Record<Retailer, string> = {
  AMAZON: "https://www.amazon.in/dp/XXXXXXXXXX?tag=your-affiliate-id",
  FLIPKART: "https://www.flipkart.com/p/itmXXXX?affid=your-affiliate-id",
  JIOMART: "https://www.jiomart.com/p/XXXX",
};

export function AffiliateLinksPanel({
  productId,
  initial,
}: {
  productId: string;
  initial: Row[];
}) {
  const toast = useAdminToast();
  const [rows, setRows] = useState<Row[]>(initial);
  const [pending, start] = useTransition();

  const patch = (retailer: Retailer, key: "url" | "enabled", val: string | boolean) =>
    setRows((rs) => rs.map((r) => (r.retailer === retailer ? { ...r, [key]: val } : r)));

  function save() {
    start(async () => {
      const res = await setAffiliateLinksAction(
        productId,
        rows.map((r) => ({ retailer: r.retailer, url: r.url.trim(), enabled: r.enabled })),
      );
      toast.show(res.ok ? "Affiliate links saved." : res.error, res.ok ? "success" : "error");
    });
  }

  return (
    <section className="rounded-xl border bg-card p-5 shadow-card">
      <h2 className="font-serif text-base font-medium text-foreground">Affiliate links</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Outbound links for the storefront price-comparison. “View on {"{retailer}"}” routes through{" "}
        <code className="rounded bg-muted px-1 py-0.5">/api/out</code>, which prefers an enabled link
        here over the auto-scraped URL and counts the click. Include your affiliate tag in the URL.
        Clear a field to remove it.
      </p>

      <div className="mt-4 space-y-4">
        {rows.map((r) => (
          <div key={r.retailer} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor={`aff-${r.retailer}`}>{NAME[r.retailer]}</Label>
              <span className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="tabular-nums">
                  {r.clicks} click{r.clicks === 1 ? "" : "s"}
                </span>
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={r.enabled}
                    onChange={(e) => patch(r.retailer, "enabled", e.target.checked)}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                  />
                  Enabled
                </label>
              </span>
            </div>
            <div className="flex gap-2">
              <Input
                id={`aff-${r.retailer}`}
                type="url"
                inputMode="url"
                placeholder={PLACEHOLDER[r.retailer]}
                value={r.url}
                onChange={(e) => patch(r.retailer, "url", e.target.value)}
              />
              {r.url ? (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-muted-foreground hover:text-foreground"
                  aria-label={`Open ${NAME[r.retailer]} link`}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          Save affiliate links
        </Button>
      </div>
    </section>
  );
}
