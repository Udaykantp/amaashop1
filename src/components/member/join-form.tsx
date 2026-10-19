"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { joinNetworkAction, type JoinState } from "@/actions/network";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Joining…" : "Join the network"}
    </Button>
  );
}

export function JoinForm({ defaultRef = "", defaultLeg = "" }: { defaultRef?: string; defaultLeg?: string }) {
  const [state, formAction] = useActionState<JoinState, FormData>(joinNetworkAction, {
    status: "idle",
  });

  if (state.status === "success") {
    return (
      <div className="rounded-xl border border-success/30 bg-success/5 p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
        <h2 className="mt-3 font-serif text-xl font-medium">You’re in!</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your member code is{" "}
          <span className="font-mono font-semibold text-foreground">{state.memberCode}</span>. Next,
          complete your KYC so you can withdraw what you earn.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button asChild>
            <Link href="/member">Go to dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/member/kyc">Start KYC</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="leg" value={defaultLeg} />
      <div className="space-y-1.5">
        <Label htmlFor="referralCode">Sponsor’s referral code</Label>
        <Input
          id="referralCode"
          name="referralCode"
          defaultValue={defaultRef}
          placeholder="AMA-7KQ4MT"
          autoComplete="off"
          autoCapitalize="characters"
          required
          aria-describedby="referralHelp"
        />
        <p id="referralHelp" className="text-xs text-muted-foreground">
          The person who invited you shared this. You can’t change your sponsor later.
        </p>
      </div>

      {state.status === "error" ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <SubmitButton />

      <p className="text-center text-xs text-muted-foreground">
        By joining you agree to the{" "}
        <Link href="/terms-of-service" className="underline">
          distributor terms
        </Link>
        .
      </p>
    </form>
  );
}
