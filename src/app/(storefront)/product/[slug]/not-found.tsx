import Link from "next/link";

export default function ProductNotFound() {
  return (
    <div className="flex h-96 flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold text-neutral-800">Product not found</h1>
      <p className="mt-2 text-neutral-500">The product you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/shop" className="mt-4 rounded-lg bg-emerald-500 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-600">
        Back to Shop
      </Link>
    </div>
  );
}
