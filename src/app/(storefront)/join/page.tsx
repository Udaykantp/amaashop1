import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { RegistrationForm } from "@/components/join/registration-form";
import { PageHeader } from "@/components/patterns/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { resolveReferrer } from "@/server/referral/resolve";

export const metadata: Metadata = {
  title: "Distributor registration",
  description: "Register as an AmaaShop distributor through your referrer's invite.",
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const cookieRef = (await cookies()).get("amaasop_ref")?.value ?? null;
  const rawRef = (ref ?? cookieRef ?? "").trim();
  const fromLink = Boolean(ref || cookieRef);

  const resolved = rawRef ? await resolveReferrer(rawRef).catch(() => null) : null;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null;

  const prefill = resolved
    ? resolved.matchedBy === "code"
      ? resolved.memberCode
      : rawRef
    : rawRef;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <PageHeader
        title="Become an AmaaShop distributor"
        description="Register below, keep shopping right away, and start earning once our team approves your account."
      />

      {rawRef && !resolved ? (
        <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          The referral ID <span className="font-mono">{rawRef}</span> is not an active member.
          Please check the number with the person who referred you, or enter it again below.
        </p>
      ) : null}

      <Card className="shadow-card">
        <CardContent className="pt-6">
          <RegistrationForm
            defaultRef={prefill}
            lockedRef={Boolean(resolved) && fromLink}
            sponsorName={resolved?.sponsorName ?? null}
            turnstileSiteKey={siteKey}
          />
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        Just want to shop?{" "}
        <Link href="/" className="text-primary hover:underline">
          Go to the store
        </Link>
      </p>
    </div>
  );
}
