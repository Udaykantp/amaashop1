"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { CheckCircle2, X, AlertCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";
interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, type: ToastType = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-20 z-[100] flex flex-col items-center gap-2 px-4 lg:top-24"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border border-neutral-100 bg-white px-4 py-3 shadow-lg animate-toast-in"
          >
            {toast.type === "success" && (
              <CheckCircle2 size={20} className="shrink-0 text-emerald-500" />
            )}
            {toast.type === "error" && <AlertCircle size={20} className="shrink-0 text-red-500" />}
            {toast.type === "info" && <Info size={20} className="shrink-0 text-blue-500" />}
            <span className="flex-1 text-sm font-medium text-neutral-800">{toast.message}</span>
            <button
              onClick={() => dismiss(toast.id)}
              className="text-neutral-400 hover:text-neutral-600"
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
