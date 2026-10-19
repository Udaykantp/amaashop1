"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { lookupReferrerAction } from "@/actions/join";
import { RegistrationForm } from "@/components/join/registration-form";
import { LEG_COOKIE, parseLeg } from "@/lib/join/leg";

/**
 * Storefront routes that must NOT be gated. This component is only ever mounted
 * by `src/app/(storefront)/layout.tsx`, so `/admin/*`, `/office/*` and
 * `/member/*` (separate layouts) are already exempt — the only carve-out here is
 * `/join` itself, which *is* the registration form.
 */
const EXEMPT_PREFIXES = ["/join"];

const REF_COOKIE = "amaasop_ref";
const DONE_COOKIE = "amaasop_registered";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]!) : null;
}

function writeCookie(name: string, value: string, maxAgeSec: number) {
  try {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSec}; samesite=lax`;
  } catch {
    /* cookies disabled */
  }
}

/**
 * Mandatory registration gate. A visitor cannot use the storefront until they
 * complete and submit the distributor registration form — there is no close
 * control, no Esc, no click-outside. Once a registration is on file
 * (`amaasop_registered` cookie, set by the submit action) the gate never shows
 * again.
 *
 * It is still rendered client-side only, so crawlers, `robots.txt`, `sitemap.xml`
 * and social/OG unfurls are unaffected — but every real browser session is
 * blocked until the form is submitted.
 */
export function JoinGate({ turnstileSiteKey = null }: { turnstileSiteKey?: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [rawRef, setRawRef] = useState("");
  const [resolved, setResolved] = useState<{ memberCode: string; sponsorName: string | null } | null>(
    null,
  );

  useEffect(() => {
    // capture an inbound ?ref= regardless of the current route
    const params = new URLSearchParams(window.location.search);
    const urlRef = params.get("ref");
    if (urlRef && !readCookie(REF_COOKIE)) {
      writeCookie(REF_COOKIE, urlRef, 60 * 60 * 24 * 30);
      // the requested side travels with the ref it came with, and no longer than it
      const urlLeg = parseLeg(params.get("leg"));
      writeCookie(LEG_COOKIE, urlLeg ?? "", urlLeg ? 60 * 60 * 24 * 30 : 0);
    }
    const ref = (urlRef || readCookie(REF_COOKIE) || "").trim();
    setRawRef(ref);

    const exempt = EXEMPT_PREFIXES.some((p) => pathname === p || pathname?.startsWith(`${p}/`));
    const registered = readCookie(DONE_COOKIE) === "1";

    if (exempt || registered) {
      setOpen(false);
      return;
    }

    setOpen(true);
    if (ref) {
      void lookupReferrerAction(ref).then((r) => {
        if (r) setResolved(r);
      });
    }
  }, [pathname]);

  // lock body scroll + trap focus inside the dialog while it is open
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const card = document.getElementById("join-gate-card");
    (card?.querySelector(FOCUSABLE) as HTMLElement | null)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !card) return;
      const nodes = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null,
      );
      if (nodes.length === 0) return;
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (!card.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto overscroll-contain bg-neutral-900/70 p-4 backdrop-blur-md sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="join-gate-title"
    >
      <div
        id="join-gate-card"
        className="my-6 w-full max-w-lg overflow-hidden rounded-2xl border bg-card shadow-2xl sm:my-10"
      >
        <div className="border-b bg-gradient-to-br from-primary/[0.08] to-transparent px-6 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            Membership registration
          </p>
          <h2 id="join-gate-title" className="mt-1 font-serif text-xl font-medium">
            Become an AmaaShop distributor
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {resolved?.sponsorName ? (
              <>
                You were referred by{" "}
                <span className="font-medium text-foreground">{resolved.sponsorName}</span>.{" "}
              </>
            ) : null}
            Register below, keep shopping right away, and start earning once our team approves your
            account.
          </p>
        </div>

        <div className="max-h-[64vh] overflow-y-auto px-6 py-5">
          <RegistrationForm
            defaultRef={resolved ? resolved.memberCode : rawRef}
            lockedRef={Boolean(resolved)}
            sponsorName={resolved?.sponsorName ?? null}
            turnstileSiteKey={turnstileSiteKey}
            onDone={() => setOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}
