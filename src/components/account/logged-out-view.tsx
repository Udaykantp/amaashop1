import { CreditCard, Heart, MapPin, ShoppingBag, User as UserIcon } from "lucide-react";
import Link from "next/link";

const FEATURES = [
  { name: "View Orders", icon: ShoppingBag },
  { name: "Manage Wishlist", icon: Heart },
  { name: "Save Addresses", icon: MapPin },
  { name: "Faster Checkout", icon: CreditCard },
];

export function LoggedOutView() {
  return (
    <div className="flex min-h-[calc(100vh-160px)] flex-col items-center justify-center p-4 text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-neutral-200">
        <UserIcon className="h-12 w-12 text-neutral-500" />
      </div>
      <h1 className="text-2xl font-bold text-neutral-800">Welcome</h1>
      <p className="mt-2 max-w-xs text-sm text-neutral-600">Sign in to manage your orders, wishlist and account.</p>
      <div className="mt-8 w-full max-w-sm space-y-3">
        <Link href="/signin" className="block w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
          Sign In
        </Link>
        <Link href="/signup" className="block w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-100">
          Create Account
        </Link>
      </div>
      <div className="mt-8 w-full max-w-sm">
        <ul className="space-y-2 text-left">
          {FEATURES.map((feature) => (
            <li key={feature.name} className="flex items-center text-sm text-neutral-600">
              <div className="mr-3 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <feature.icon className="h-4 w-4" />
              </div>
              {feature.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
