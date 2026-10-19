import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex h-96 flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold text-neutral-800">Page not found</h1>
      <p className="mt-2 text-sm text-neutral-500">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/" className="mt-6 rounded-lg bg-emerald-500 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-600">
        Back to Home
      </Link>
    </div>
  );
}
