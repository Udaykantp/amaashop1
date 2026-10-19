"use client";

import { MapPin } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function PincodeChecker() {
  const [pincode, setPincode] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const checkPincode = () => {
    setResult(
      pincode.length >= 5 ? "Delivery available! Expected in 2-3 days" : "Please enter a valid pincode",
    );
  };

  return (
    <div className="mt-4 rounded-xl border border-neutral-100 p-3">
      <div className="flex items-center gap-2 text-sm font-medium text-neutral-700">
        <MapPin size={16} className="text-emerald-600" />
        Check Delivery
      </div>
      <div className="mt-2 flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={pincode}
          onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
          placeholder="Enter pincode"
          className="h-10 flex-1 rounded-lg border border-neutral-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          onClick={checkPincode}
          className="rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-white active:bg-emerald-600"
        >
          Check
        </button>
      </div>
      {result && (
        <p className={cn("mt-2 text-xs", result.includes("available") ? "text-emerald-600" : "text-red-500")}>
          {result}
        </p>
      )}
    </div>
  );
}
