"use client";

import { Check, Copy, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { legParam, type RequestedLeg } from "@/lib/join/leg";
import { cn } from "@/lib/utils";

const SIDES: { value: RequestedLeg | null; label: string; hint: string }[] = [
  { value: null, label: "Any side", hint: "New people go to your weaker leg automatically." },
  { value: "LEFT", label: "Left team", hint: "New people are placed in your left leg." },
  { value: "RIGHT", label: "Right team", hint: "New people are placed in your right leg." },
];

/**
 * Referral link + QR. Shown on the dashboard and inside the empty team state
 * (brief §5.2) so a brand-new member always has a way to grow their team in
 * reach. The side picker builds a left- or right-team link (`&leg=left|right`)
 * so a distributor can deliberately feed the weaker side of their binary tree.
 */
export function ReferralShare({ memberCode }: { memberCode: string }) {
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [side, setSide] = useState<RequestedLeg | null>(null);
  const suffix = side ? `&leg=${legParam(side)}` : "";
  const [link, setLink] = useState(`/member/join?ref=${memberCode}`);

  useEffect(() => {
    const url = `${window.location.origin}/member/join?ref=${memberCode}${suffix}`;
    setLink(url);
    QRCode.toDataURL(url, { width: 320, margin: 1, color: { dark: "#1c3a2e", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [memberCode, suffix]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the field is selectable as a fallback */
    }
  }

  async function share() {
    if (navigator.share) {
      await navigator.share({ title: "Join my AmaaShop team", url: link }).catch(() => {});
    } else {
      copy();
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      {qr ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qr}
          alt={`QR code linking to your referral page, code ${memberCode}`}
          className="h-28 w-28 shrink-0 rounded-lg border bg-white p-1"
          width={112}
          height={112}
        />
      ) : (
        <div className="h-28 w-28 shrink-0 animate-skeleton rounded-lg bg-muted" />
      )}

      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Your referral link
        </p>
        <div role="radiogroup" aria-label="Which team should new people join?" className="inline-flex rounded-md border p-0.5">
          {SIDES.map((s) => (
            <button
              key={s.label}
              type="button"
              role="radio"
              aria-checked={side === s.value}
              onClick={() => setSide(s.value)}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                side === s.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{SIDES.find((s) => s.value === side)!.hint}</p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 truncate rounded-md border bg-muted/50 px-2.5 py-1.5 text-sm"
          />
          <Button type="button" size="icon" variant="outline" onClick={copy} aria-label="Copy referral link">
            {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" onClick={share} className="gap-1.5">
            <Share2 className="h-4 w-4" /> Share
          </Button>
          <span className="text-xs text-muted-foreground">
            Code <span className="font-mono font-semibold text-foreground">{memberCode}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
