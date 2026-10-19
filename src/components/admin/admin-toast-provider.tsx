"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";
interface AdminToast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface AdminToastContextValue {
  show: (message: string, variant?: ToastVariant) => void;
}

const AdminToastContext = createContext<AdminToastContextValue | undefined>(undefined);

const VARIANT_ICON: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const VARIANT_CLASS: Record<ToastVariant, string> = {
  success: "text-success",
  error: "text-destructive",
  info: "text-[hsl(var(--ws))]",
};

/**
 * Admin-console toast notifications — a separate, admin-themed instance from
 * the storefront's `ToastProvider` (different design tokens, and the admin
 * shell doesn't mount the storefront's client providers).
 */
export function AdminToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<AdminToast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant = "success") => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => dismiss(id), 3500);
    },
    [dismiss],
  );

  return (
    <AdminToastContext.Provider value={{ show }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[200] flex flex-col items-center gap-2 px-4 sm:items-end sm:right-4 sm:left-auto sm:px-0"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const Icon = VARIANT_ICON[toast.variant];
          return (
            <div
              key={toast.id}
              role="status"
              className="animate-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-card px-4 py-3 text-card-foreground shadow-lg"
            >
              <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", VARIANT_CLASS[toast.variant])} />
              <span className="flex-1 text-sm font-medium">{toast.message}</span>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </AdminToastContext.Provider>
  );
}

export function useAdminToast() {
  const ctx = useContext(AdminToastContext);
  if (!ctx) throw new Error("useAdminToast must be used within AdminToastProvider");
  return ctx;
}
