import { Hammer } from "lucide-react";

export function OfficeStub({
  title,
  description,
  bullets,
}: {
  title: string;
  description: string;
  bullets: string[];
}) {
  return (
    <div>
      <h1 className="font-serif text-2xl font-medium tracking-tight text-slate-900">{title}</h1>
      <p className="mt-1 max-w-prose text-sm text-slate-500">{description}</p>

      <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-6">
        <div className="flex items-center gap-2 text-slate-700">
          <Hammer className="h-4 w-4" />
          <p className="text-sm font-semibold">Rolling out shortly — here&apos;s what it will include:</p>
        </div>
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-slate-600">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
              {b}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
