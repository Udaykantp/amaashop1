import { Suspense } from "react";
import { OfficeLoginForm } from "@/components/office/office-login-form";
import { redirectIfSignedIn } from "@/server/office/context";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function OfficeLoginPage() {
  await redirectIfSignedIn();
  return (
    <Suspense fallback={<div className="h-64 w-full max-w-sm animate-pulse rounded-2xl bg-white" />}>
      <OfficeLoginForm />
    </Suspense>
  );
}
