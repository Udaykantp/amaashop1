import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Sign In",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-200px)] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-bold text-neutral-800">Welcome back</h1>
      <p className="mt-1 text-sm text-neutral-500">Sign in to manage your orders, wishlist and account.</p>
      <div className="mt-6 rounded-xl border border-neutral-100 bg-white p-6">
        <AuthForm mode="signin" />
      </div>
      <p className="mt-4 text-center text-sm text-neutral-500">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-emerald-600 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
