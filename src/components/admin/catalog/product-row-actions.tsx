"use client";

import { Copy, MoreHorizontal, PencilLine, ExternalLink, Archive, CheckCircle2, Trash2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { ProductStatus } from "@/server/enums";
import { deleteProductAction, duplicateProductAction, setProductStatusAction } from "@/actions/catalog";
import { useAdminToast } from "@/components/admin/admin-toast-provider";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SITE_URL } from "@/lib/constants";

export function ProductRowActions({
  id,
  slug,
  status,
  name,
}: {
  id: string;
  slug: string;
  status: ProductStatus;
  name: string;
}) {
  const router = useRouter();
  const toast = useAdminToast();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const close = () => detailsRef.current?.removeAttribute("open");

  function run(fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    setErr(null);
    start(async () => {
      const res = await fn();
      close();
      if (res.ok) {
        router.refresh();
        if (res.message) toast.show(res.message, "success");
      } else {
        setErr(res.error ?? "Failed");
        toast.show(res.error ?? "Something went wrong. Please try again.", "error");
      }
    });
  }

  function confirmDelete() {
    setConfirmOpen(false);
    run(() => deleteProductAction(id));
  }

  return (
    <details
      ref={detailsRef}
      name="product-row-actions"
      className="group relative inline-block text-left"
    >
      <summary
        className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-md border text-muted-foreground hover:bg-secondary [&::-webkit-details-marker]:hidden"
        aria-label="Row actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </summary>

      <div className="absolute right-0 z-20 mt-1 w-48 rounded-md border bg-popover p-1 text-sm shadow-md">
        <Link
          href={`/admin/catalog/${id}`}
          className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-secondary"
        >
          <PencilLine className="h-4 w-4" /> Edit
        </Link>

        <a
          href={`${SITE_URL}/product/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-secondary"
        >
          <ExternalLink className="h-4 w-4" /> View on store
        </a>

        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => duplicateProductAction(id))}
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 hover:bg-secondary disabled:opacity-50"
        >
          <Copy className="h-4 w-4" /> Duplicate
        </button>

        <div className="my-1 border-t" />

        {status !== "ACTIVE" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setProductStatusAction(id, "ACTIVE"))}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-success hover:bg-success/10 disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" /> Publish
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setProductStatusAction(id, "DRAFT"))}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 hover:bg-secondary disabled:opacity-50"
          >
            <Undo2 className="h-4 w-4" /> Unpublish (to draft)
          </button>
        )}

        {status !== "ARCHIVED" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setProductStatusAction(id, "ARCHIVED"))}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            <Archive className="h-4 w-4" /> Archive
          </button>
        ) : null}

        <div className="my-1 border-t" />

        <button
          type="button"
          disabled={pending}
          onClick={() => {
            close();
            setConfirmOpen(true);
          }}
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" /> Delete
        </button>

        {err ? <p className="px-2 py-1 text-[11px] text-destructive">{err}</p> : null}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{name}”?</DialogTitle>
            <DialogDescription>
              This permanently removes the product, its images, variants, affiliate links and stock
              levels. Past orders that included it are unaffected. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="inline-flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={confirmDelete}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {pending ? <Spinner size="xs" /> : <Trash2 className="h-4 w-4" />}
              Delete product
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </details>
  );
}
