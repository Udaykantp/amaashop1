"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import Script from "next/script";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  lookupReferrerAction,
  submitMemberApplicationAction,
  type JoinFormState,
} from "@/actions/join";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LEG_COOKIE, parseLeg } from "@/lib/join/leg";
import { cn } from "@/lib/utils";

const selectCls =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

function Field({
  id,
  label,
  children,
  error,
  hint,
  required,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Submitting…" : "Submit registration"}
    </Button>
  );
}

export function RegistrationForm({
  defaultRef = "",
  lockedRef = false,
  sponsorName = null,
  turnstileSiteKey = null,
  onDone,
  onValidityChange,
}: {
  defaultRef?: string;
  lockedRef?: boolean;
  sponsorName?: string | null;
  turnstileSiteKey?: string | null;
  /** When set, the success panel shows a "Continue" button that calls this
   *  instead of linking to the store — used by the modal gate to close itself. */
  onDone?: () => void;
  /** Fires whenever the form's completeness changes (native `checkValidity`).
   *  The modal gate uses this to reveal its close control only once the form is
   *  filled in. */
  onValidityChange?: (valid: boolean) => void;
}) {
  const [state, formAction] = useActionState<JoinFormState, FormData>(
    submitMemberApplicationAction,
    { status: "idle" },
  );
  const fe = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  // Side of the referrer's tree the invite link asked for (?leg=left|right), kept
  // by the join gate in a cookie so it survives navigation. Only a request —
  // the server validates it and an admin can override it at approval.
  const [requestedLeg, setRequestedLeg] = useState("");
  useEffect(() => {
    const fromUrl = parseLeg(new URLSearchParams(window.location.search).get("leg"));
    const fromCookie = parseLeg(
      document.cookie.match(new RegExp(`(?:^|; )${LEG_COOKIE}=([^;]*)`))?.[1] ?? null,
    );
    setRequestedLeg(fromUrl ?? fromCookie ?? "");
  }, []);

  const [autofill, setAutofill] = useState<{ district?: string; state?: string; city?: string }>({});

  // Live sponsor check for a manually-typed referrer, so the visitor gets a
  // clear ✓ / ✗ before they submit rather than a scary error afterwards.
  const [refValue, setRefValue] = useState(defaultRef);
  const [refCheck, setRefCheck] = useState<
    | { state: "idle" }
    | { state: "checking" }
    | { state: "ok"; name: string | null }
    | { state: "bad" }
  >(lockedRef && sponsorName ? { state: "ok", name: sponsorName } : { state: "idle" });

  useEffect(() => {
    if (lockedRef) return;
    const v = refValue.trim();
    if (v.length < 3) {
      setRefCheck({ state: "idle" });
      return;
    }
    let cancelled = false;
    setRefCheck({ state: "checking" });
    const t = setTimeout(async () => {
      const r = await lookupReferrerAction(v);
      if (!cancelled) setRefCheck(r ? { state: "ok", name: r.sponsorName } : { state: "bad" });
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [refValue, lockedRef]);

  const formRef = useRef<HTMLFormElement>(null);
  const reportValidity = useCallback(() => {
    onValidityChange?.(formRef.current?.checkValidity() ?? false);
  }, [onValidityChange]);

  useEffect(() => {
    reportValidity();
  }, [reportValidity, autofill]);

  useEffect(() => {
    if (state.status === "success") onValidityChange?.(true);
  }, [state.status, onValidityChange]);

  async function lookupPincode(pin: string) {
    if (!/^\d{6}$/.test(pin)) return;
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const json = (await res.json()) as Array<{
        Status: string;
        PostOffice?: Array<{ Name: string; District: string; State: string }>;
      }>;
      const po = json?.[0]?.Status === "Success" ? json[0].PostOffice?.[0] : undefined;
      if (po) setAutofill({ district: po.District, state: po.State, city: po.Name });
    } catch {
      /* offline / rate-limited — user types it manually */
    }
  }

  if (state.status === "success") {
    return (
      <div className="rounded-xl border border-success/30 bg-success/5 p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
        <h2 className="mt-3 font-serif text-xl font-medium">Registration received</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Our team will verify your details and set up your distributor account. You can keep
          browsing the store in the meantime — you&rsquo;ll get your member code once your
          application is approved.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          {onDone ? (
            <Button onClick={onDone}>Continue to the store</Button>
          ) : (
            <Button asChild>
              <Link href="/">Continue to the store</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onChange={reportValidity}
      onInput={reportValidity}
      className="space-y-5"
    >
      {sponsorName ? (
        <p className="rounded-lg bg-primary/5 px-3 py-2 text-sm">
          You were referred by <span className="font-medium text-foreground">{sponsorName}</span>.
        </p>
      ) : null}

      <input type="hidden" name="leg" value={requestedLeg} />

      <Field
        id="referrerInput"
        label="Referrer's mobile number or AMA code"
        required
        error={fe.referrerInput}
        hint={
          lockedRef
            ? "Filled in from your invite link."
            : "The 10-digit mobile number (or AMA-XXXXXX code) of the person who referred you."
        }
      >
        <Input
          id="referrerInput"
          name="referrerInput"
          value={refValue}
          onChange={(e) => setRefValue(e.target.value)}
          readOnly={lockedRef}
          required
          autoComplete="off"
          aria-invalid={!lockedRef && refCheck.state === "bad"}
          className={cn("font-mono", lockedRef && "bg-muted/50")}
          placeholder="9876543210  or  AMA-XXXXXX"
        />
        {!lockedRef && refCheck.state === "checking" ? (
          <p className="text-xs text-muted-foreground">Checking…</p>
        ) : null}
        {refCheck.state === "ok" ? (
          <p className="text-xs font-medium text-success">
            ✓ Referred by {refCheck.name ?? "an active distributor"}
          </p>
        ) : null}
        {!lockedRef && refCheck.state === "bad" ? (
          <p className="text-xs text-warning">
            We couldn&rsquo;t find an active distributor with that mobile number or AMA code.
            Double-check it with whoever invited you.
          </p>
        ) : null}
      </Field>

      <Field
        id="phone"
        label="Your mobile number"
        required
        error={fe.phone}
        hint="10 digits. We'll use this to contact you about your application."
      >
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="numeric"
          required
          pattern="[0-9]{10}"
          title="Enter a 10-digit mobile number"
          maxLength={10}
          autoComplete="tel"
          placeholder="9876543210"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,10rem)_1fr]">
        <Field id="idProofType" label="ID proof" error={fe.idProofType}>
          <select id="idProofType" name="idProofType" className={selectCls} defaultValue="">
            <option value="">Select…</option>
            <option value="AADHAAR_LAST4">Aadhaar</option>
            <option value="PAN">PAN card</option>
            <option value="VOTER_ID">Voter ID</option>
            <option value="DL">Driving licence</option>
          </select>
        </Field>
        <Field
          id="idProofValue"
          label="ID number"
          error={fe.idProofValue}
          hint="Only the last 4 characters are stored now. Full documents are collected later during KYC."
        >
          <Input id="idProofValue" name="idProofValue" autoComplete="off" placeholder="XXXX XXXX 1234" />
        </Field>
      </div>

      <Field id="fullName" label="Full name" required error={fe.fullName}>
        <Input id="fullName" name="fullName" required autoComplete="name" placeholder="Priya Sharma" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="age" label="Age" required error={fe.age}>
          <Input id="age" name="age" type="number" min={18} max={100} required placeholder="30" />
        </Field>
        <Field id="familyMemberCount" label="Family members" required error={fe.familyMemberCount}>
          <Input
            id="familyMemberCount"
            name="familyMemberCount"
            type="number"
            min={0}
            max={30}
            required
            placeholder="4"
          />
        </Field>
        <Field id="gender" label="Gender" error={fe.gender}>
          <select id="gender" name="gender" className={selectCls} defaultValue="">
            <option value="">Prefer not to say</option>
            <option value="FEMALE">Female</option>
            <option value="MALE">Male</option>
            <option value="OTHER">Other</option>
          </select>
        </Field>
      </div>

      <fieldset className="space-y-4 rounded-lg border p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Address
        </legend>
        <Field id="addressLine" label="House / street" required error={fe.addressLine}>
          <Input id="addressLine" name="addressLine" required autoComplete="street-address" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="pincode" label="Pincode" required error={fe.pincode}>
            <Input
              id="pincode"
              name="pincode"
              inputMode="numeric"
              maxLength={6}
              required
              pattern="[0-9]{6}"
              title="Enter a 6-digit pincode"
              autoComplete="postal-code"
              onBlur={(e) => void lookupPincode(e.target.value.trim())}
              placeholder="560001"
            />
          </Field>
          <Field id="city" label="Village / city" required error={fe.city}>
            <Input
              id="city"
              name="city"
              required
              autoComplete="address-level2"
              key={`city-${autofill.city ?? ""}`}
              defaultValue={autofill.city ?? ""}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="district" label="District" required error={fe.district}>
            <Input
              id="district"
              name="district"
              required
              key={`district-${autofill.district ?? ""}`}
              defaultValue={autofill.district ?? ""}
            />
          </Field>
          <Field id="state" label="State" required error={fe.state}>
            <Input
              id="state"
              name="state"
              required
              autoComplete="address-level1"
              key={`state-${autofill.state ?? ""}`}
              defaultValue={autofill.state ?? ""}
            />
          </Field>
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="email" label="Email (optional)" error={fe.email}>
          <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" />
        </Field>
        <Field id="nomineeName" label="Nominee name (optional)" error={fe.nomineeName}>
          <Input id="nomineeName" name="nomineeName" autoComplete="off" />
        </Field>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="sponsorConfirmed" value="on" className="mt-0.5 h-4 w-4" required />
        <span>
          I confirm I was referred by{" "}
          <span className="font-medium">{sponsorName ?? "the person above"}</span>.
        </span>
      </label>
      {fe.sponsorConfirmed ? (
        <p className="-mt-2 text-xs text-destructive">{fe.sponsorConfirmed}</p>
      ) : null}

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="termsAccepted" value="on" className="mt-0.5 h-4 w-4" required />
        <span>
          I accept the{" "}
          <Link href="/terms-of-service" className="underline" target="_blank">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy-policy" className="underline" target="_blank">
            Privacy Policy
          </Link>
          , and consent to AmaaShop processing this information to review my membership.
        </span>
      </label>
      {fe.termsAccepted ? <p className="-mt-2 text-xs text-destructive">{fe.termsAccepted}</p> : null}

      {turnstileSiteKey ? (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            async
            defer
            strategy="afterInteractive"
          />
          <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-theme="light" />
        </>
      ) : (
        <p className="text-xs text-muted-foreground">Captcha disabled (no site key configured).</p>
      )}

      {state.status === "error" ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <SubmitButton />

      <p className="text-center text-xs text-muted-foreground">
        Full distributor benefits (referral income, downline view, payouts) activate once an admin
        approves your KYC.
      </p>
    </form>
  );
}
