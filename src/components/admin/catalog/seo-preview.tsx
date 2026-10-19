"use client";

import { AlertTriangle, CheckCircle2, Globe, XCircle } from "lucide-react";
import { useMemo } from "react";
import {
  productPath,
  resolveMetaDescription,
  resolveMetaTitle,
  runSeoChecks,
  seoScore,
  type SeoProduct,
} from "@/lib/catalog/seo";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function SeoPreview({ product }: { product: SeoProduct }) {
  const title = resolveMetaTitle(product, SITE_NAME);
  const desc = resolveMetaDescription(product);
  const checks = useMemo(() => runSeoChecks(product, SITE_NAME), [product]);
  const score = seoScore(checks);
  const prettyUrl = `${SITE_URL.replace(/^https?:\/\//, "")}${productPath(product.slug || "your-product")}`
    .split("/")
    .join(" › ");

  const scoreTone =
    score >= 80 ? "text-success" : score >= 55 ? "text-warning" : "text-destructive";

  return (
    <div className="space-y-4">
      {/* Google SERP snippet */}
      <div className="rounded-lg border bg-card p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Google preview
        </p>
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full border bg-background">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
          <div className="leading-tight">
            <p className="text-[13px] text-foreground">{SITE_NAME}</p>
            <p className="text-xs text-muted-foreground">{prettyUrl}</p>
          </div>
        </div>
        <p className="mt-1 text-lg leading-snug text-[#1a0dab] dark:text-[#8ab4f8]">{title}</p>
        <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{desc}</p>
        {product.noIndex ? (
          <p className="mt-2 inline-flex items-center gap-1 rounded bg-destructive/10 px-1.5 py-0.5 text-[11px] font-medium text-destructive">
            <XCircle className="h-3 w-3" /> noindex — hidden from search
          </p>
        ) : null}
      </div>

      {/* Score + checklist */}
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            On-page SEO
          </p>
          <p className={cn("text-sm font-semibold tabular-nums", scoreTone)}>{score}/100</p>
        </div>
        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              score >= 80 ? "bg-success" : score >= 55 ? "bg-warning" : "bg-destructive",
            )}
            style={{ width: `${score}%` }}
          />
        </div>
        <ul className="space-y-1.5">
          {checks.map((c) => {
            const Icon =
              c.status === "pass" ? CheckCircle2 : c.status === "warn" ? AlertTriangle : XCircle;
            const tone =
              c.status === "pass"
                ? "text-success"
                : c.status === "warn"
                  ? "text-warning"
                  : "text-destructive";
            return (
              <li key={c.id} className="flex items-start gap-2 text-xs">
                <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", tone)} />
                <span className="text-foreground">
                  {c.label}
                  {c.status !== "pass" ? (
                    <span className="text-muted-foreground"> — {c.hint}</span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
