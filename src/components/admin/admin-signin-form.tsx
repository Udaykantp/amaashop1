"use client";

import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { signInAdmin } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export function AdminSignInForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    const identifier = String(formData.get("identifier") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    start(async () => {
      const res = await signInAdmin(identifier, password);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.replace("/admin");
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-card">
      <h1 className="font-serif text-xl font-medium">Sign in to the console</h1>
      <p className="mt-1 text-sm text-muted-foreground">Admin access only. All actions are logged.</p>

      <form action={onSubmit} className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="identifier">E-mail or mobile number</Label>
          <Input
            id="identifier"
            name="identifier"
            type="text"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="you@example.com or 98765 43210"
            required
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error ? (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? (
            <>
              <Spinner size="xs" /> Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Only accounts authorised for the console can sign in.
      </p>
    </div>
  );
}
