"use client";

import { Download } from "lucide-react";
import { useTransition } from "react";
import { exportDownlineCsvAction } from "@/actions/network";
import { useAdminToast } from "@/components/admin/admin-toast-provider";

export function ExportDownlineButton({ memberProfileId }: { memberProfileId: string }) {
  const toast = useAdminToast();
  const [pending, start] = useTransition();

  function download() {
    start(async () => {
      try {
        const { filename, csv, rowCount } = await exportDownlineCsvAction(memberProfileId);
        const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast.show(`Exported ${rowCount} row${rowCount === 1 ? "" : "s"} to ${filename}.`, "success");
      } catch {
        toast.show("Could not build the export. Try again.", "error");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={pending}
      className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium hover:bg-secondary disabled:opacity-50"
    >
      <Download className="h-4 w-4" />
      {pending ? "Preparing…" : "Export genealogy (CSV)"}
    </button>
  );
}
