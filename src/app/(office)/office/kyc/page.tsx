import { CheckCircle2, Circle, XCircle } from "lucide-react";
import Link from "next/link";
import { getOfficeContext } from "@/server/office/context";
import { getKycView } from "@/server/office/data";

export const metadata = { title: "KYC & Bank" };
export const dynamic = "force-dynamic";

const STATUS_BANNER: Record<string, { cls: string; text: string }> = {
  APPROVED: { cls: "border-teal-200 bg-teal-50 text-teal-800", text: "Verified — withdrawals are unlocked." },
  SUBMITTED: { cls: "border-amber-200 bg-amber-50 text-amber-800", text: "Submitted — under review by our compliance team." },
  UNDER_REVIEW: { cls: "border-amber-200 bg-amber-50 text-amber-800", text: "Under review by our compliance team." },
  REJECTED: { cls: "border-red-200 bg-red-50 text-red-700", text: "Some details need fixing — see the note below." },
  NOT_SUBMITTED: { cls: "border-slate-200 bg-slate-50 text-slate-600", text: "Not started. This is required before your first withdrawal." },
};

export default async function OfficeKycPage() {
  const ctx = await getOfficeContext();
  const kyc = await getKycView(ctx.userId);
  const banner = STATUS_BANNER[kyc.status] ?? STATUS_BANNER.NOT_SUBMITTED!;

  const rows = [
    { label: "PAN card", done: kyc.documents.pan, detail: kyc.panLast4 ? `••••${kyc.panLast4}` : null },
    { label: "Aadhaar", done: kyc.documents.aadhaar, detail: kyc.aadhaarLast4 ? `••••${kyc.aadhaarLast4}` : null },
    { label: "Bank account", done: kyc.hasBank, detail: kyc.bankLast4 ? `a/c ••${kyc.bankLast4} · ${kyc.ifsc ?? ""}` : null },
    { label: "Photo / selfie", done: kyc.documents.photo, detail: null },
  ];

  return (
    <>
      <h1 className="font-serif text-2xl font-medium tracking-tight text-slate-900">KYC & Bank</h1>
      <p className="mt-1 text-sm text-slate-500">
        Identity and bank verification. Everything is encrypted at rest and shown masked.
      </p>

      <div className={`mt-5 rounded-xl border p-4 text-sm ${banner.cls}`}>{banner.text}</div>

      {kyc.status === "REJECTED" && kyc.rejectionReason ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Reviewer note: {kyc.rejectionReason}
        </p>
      ) : null}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <ul className="divide-y divide-slate-100">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div className="flex items-center gap-3">
                {r.done ? (
                  <CheckCircle2 className="h-5 w-5 text-teal-600" />
                ) : kyc.status === "REJECTED" ? (
                  <XCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <Circle className="h-5 w-5 text-slate-300" />
                )}
                <div>
                  <p className="text-sm font-medium text-slate-800">{r.label}</p>
                  {r.detail ? <p className="text-xs text-slate-400">{r.detail}</p> : null}
                </div>
              </div>
              <span className="text-xs font-medium text-slate-400">
                {r.done ? "On file" : "Pending"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Link
          href="/member/kyc"
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          {kyc.status === "NOT_SUBMITTED" ? "Start KYC" : "Update documents"}
        </Link>
        <p className="text-xs text-slate-400">
          Opens the guided KYC flow (Personal → Nominee → Bank → Documents).
        </p>
      </div>
    </>
  );
}
