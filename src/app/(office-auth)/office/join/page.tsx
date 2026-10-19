import { Users } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Become a distributor" };

export default function OfficeJoinGatePage() {
  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
        <Users className="h-6 w-6" />
      </span>
      <h1 className="font-serif text-xl font-medium text-slate-900">
        The Back-Office is for AmaaShop distributors
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        You&apos;re signed in, but this account isn&apos;t linked to a distributor profile yet. Join a
        sponsor&apos;s team to unlock earnings, team tools and payouts.
      </p>
      <div className="mt-6 flex flex-col gap-2">
        <Link
          href="/member/join"
          className="flex h-10 items-center justify-center rounded-lg bg-teal-600 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Join the network
        </Link>
        <Link
          href="/office/login"
          className="flex h-10 items-center justify-center rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Sign in with a different account
        </Link>
      </div>
    </div>
  );
}
