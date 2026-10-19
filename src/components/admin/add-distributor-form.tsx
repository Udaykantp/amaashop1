"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createDistributorAction, type CreateDistributorResult } from "@/actions/admin";
import { useAdminToast } from "@/components/admin/admin-toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SuccessResult = Extract<CreateDistributorResult, { ok: true }>;

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

export function AddDistributorForm() {
  const router = useRouter();
  const toast = useAdminToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SuccessResult | null>(null);

  function submit(formData: FormData) {
    setError(null);
    setFieldErrors({});
    start(async () => {
      const res = await createDistributorAction(formData);
      if (res.ok) {
        setResult(res);
        toast.show(`Distributor ${res.memberCode} added.`, "success");
      } else {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
        toast.show(res.error ?? "Something went wrong. Please try again.", "error");
      }
    });
  }

  if (result) {
    return (
      <Card className="border-success/40 bg-success/5 shadow-card">
        <CardContent className="space-y-3 pt-6 text-sm">
          <p className="font-medium text-foreground">Distributor added and placed in the network.</p>

          <div className="flex items-center justify-between rounded-md border bg-card px-3 py-2">
            <span className="text-muted-foreground">Referral code</span>
            <span className="font-mono font-semibold">{result.memberCode}</span>
          </div>

          {result.placedUnderCode && result.leg ? (
            <div className="flex items-center justify-between rounded-md border bg-card px-3 py-2">
              <span className="text-muted-foreground">Placed</span>
              <span>
                <span className="font-mono font-semibold">{result.placedUnderCode}</span>
                <span className="ml-1.5 font-medium">· {result.leg === "LEFT" ? "Left" : "Right"} leg</span>
              </span>
            </div>
          ) : null}
          {result.spilledOver ? (
            <p className="text-xs text-muted-foreground">
              The referrer&rsquo;s own slot on that side was already taken, so this distributor spilled over to the
              next open position beneath them. The referrer still gets the credit.
            </p>
          ) : null}

          {result.resetLink ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                New account — share this one-time link so they can set their own password:
              </p>
              <p className="break-all rounded-md border bg-card px-3 py-2 font-mono text-xs">
                {result.resetLink}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              They can start shopping right away. Full benefits activate once an admin approves their
              KYC.
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Link href={`/admin/members/${result.memberId}`}>
              <Button size="sm">View distributor</Button>
            </Link>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setResult(null);
                router.refresh();
              }}
            >
              Add another
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form action={submit} className="space-y-4 rounded-xl border bg-card p-5 shadow-card">
      <Field
        id="referrerInput"
        label="Referrer's mobile number or AMA code"
        required
        error={fieldErrors.referrerInput}
        hint="The person who brought them in. Accepts a 10-digit mobile or an AMA-XXXXXX code."
      >
        <Input
          id="referrerInput"
          name="referrerInput"
          required
          autoComplete="off"
          className="font-mono"
          placeholder="9876543210  or  AMA-XXXXXX"
        />
      </Field>

      <Field
        id="leg"
        label="Place on"
        hint="Each distributor has one left and one right slot. If the chosen side is full, the new distributor spills over to the first open spot beneath it. Auto grows the referrer's weaker leg."
      >
        <select
          id="leg"
          name="leg"
          defaultValue="AUTO"
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="AUTO">Auto — weaker leg</option>
          <option value="LEFT">Left leg</option>
          <option value="RIGHT">Right leg</option>
        </select>
      </Field>

      <Field id="fullName" label="Full name" required error={fieldErrors.fullName}>
        <Input id="fullName" name="fullName" required autoComplete="name" placeholder="Priya Sharma" />
      </Field>

      <Field
        id="phone"
        label="Mobile number"
        required
        error={fieldErrors.phone}
        hint="10 digits. This is how we reach the distributor and the key to their account."
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

      <Field
        id="email"
        label="Email (optional)"
        error={fieldErrors.email}
        hint="Recommended — needed for the distributor to sign in to their back-office."
      >
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="priya@example.com" />
      </Field>

      {error ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add distributor & generate referral code"}
      </Button>
    </form>
  );
}
