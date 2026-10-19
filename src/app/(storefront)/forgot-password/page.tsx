import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-200px)] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-bold text-neutral-800">Reset your password</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Enter the email on your account and we&apos;ll send you a link to set a new one.
      </p>
      <div className="mt-6 rounded-xl border border-neutral-100 bg-white p-6">
        <ForgotPasswordForm />
      </div>
      <p className="mt-4 text-center text-sm text-neutral-500">
        Remembered it?{" "}
        <Link href="/signin" className="font-medium text-emerald-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
