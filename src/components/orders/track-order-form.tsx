"use client";

import { PackageSearch } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function TrackOrderForm() {
  const router = useRouter();
  const [orderId, setOrderId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = orderId.trim();
    if (!trimmed) {
      setError("Enter your order ID to continue");
      return;
    }
    router.push(`/orders/${trimmed}`);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 rounded-xl border border-neutral-100 bg-white p-6 md:p-8">
      <label className="mb-1 block text-sm font-medium text-neutral-700">Order ID</label>
      <p className="mb-3 text-xs text-neutral-500">
        Find this in your order confirmation — either the full ID or the short code shown as{" "}
        <span className="font-mono">#XXXXXXXX</span>.
      </p>
      <div className="flex gap-2">
        <input
          value={orderId}
          onChange={(e) => {
            setOrderId(e.target.value);
            setError(null);
          }}
          placeholder="e.g. 487050b7-49c3-4114..."
          className="h-11 flex-1 rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="submit"
          className="flex items-center gap-2 rounded-lg bg-emerald-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
        >
          <PackageSearch size={16} />
          Track
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </form>
  );
}
