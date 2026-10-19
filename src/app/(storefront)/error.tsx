"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-96 flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold text-neutral-800">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-neutral-500">
        We hit an unexpected error loading this page. Please try again.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-emerald-500 px-6 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
      >
        Try Again
      </button>
    </div>
  );
}
