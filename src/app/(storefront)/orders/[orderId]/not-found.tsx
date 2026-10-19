import Link from "next/link";

export default function OrderNotFound() {
  return (
    <div className="flex h-96 flex-col items-center justify-center text-center">
      <h1 className="text-2xl font-bold text-neutral-800">Order not found</h1>
      <p className="mt-2 text-neutral-500">Check the link and try again, or contact support for help.</p>
      <Link href="/" className="mt-4 rounded-xl bg-emerald-500 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-600">
        Back to Home
      </Link>
    </div>
  );
}
