import { ArrowUp, Scale, Users } from "lucide-react";
import Link from "next/link";
import { GenealogyTree } from "@/components/admin/genealogy-tree";
import { NetworkLevels } from "@/components/member/network-levels";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getNetworkSummary } from "@/server/member/overview";
import { MAX_TREE_DEPTH, type LegSummary } from "@/server/network/binary-tree";
import { getUplineChain } from "@/server/network/genealogy";
import { getOfficeContext } from "@/server/office/context";
import { getMyTeamView } from "@/server/office/team";

export const metadata = { title: "My Team" };
export const dynamic = "force-dynamic";

const DEFAULT_DEPTH = 3;

function LegCard({ leg, tone }: { leg: LegSummary; tone: "left" | "right" }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-t-[3px] border-slate-200 bg-white p-4 shadow-sm",
        tone === "left" ? "border-t-primary" : "border-t-warning",
      )}
    >
      <p className={cn("text-[11px] font-semibold uppercase tracking-wider", tone === "left" ? "text-primary" : "text-warning")}>
        {tone === "left" ? "Left team" : "Right team"}
      </p>
      <p className="mt-1 truncate text-sm font-medium text-slate-800">
        {leg.head ? (
          <>
            {leg.head.name} <span className="font-mono text-xs font-normal text-slate-400">{leg.head.memberCode}</span>
          </>
        ) : (
          <span className="font-normal text-slate-500">Open slot — nobody yet</span>
        )}
      </p>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        {[
          { k: "Members", v: String(leg.members) },
          { k: "Active", v: String(leg.active) },
          { k: "Volume (BV)", v: formatINR(leg.volume) },
        ].map((s) => (
          <div key={s.k}>
            <dt className="text-xs text-slate-400">{s.k}</dt>
            <dd className="text-lg font-semibold tabular-nums text-slate-900">{s.v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default async function OfficeTeamPage({
  searchParams,
}: {
  searchParams: Promise<{ at?: string; depth?: string }>;
}) {
  const ctx = await getOfficeContext();
  const { at, depth: depthParam } = await searchParams;
  const depth = Math.min(MAX_TREE_DEPTH, Math.max(2, Number.parseInt(depthParam ?? "", 10) || DEFAULT_DEPTH));

  const [summary, upline, team] = await Promise.all([
    getNetworkSummary(ctx.memberProfileId),
    getUplineChain(ctx.memberProfileId, 20).catch(() => []),
    getMyTeamView(ctx.memberProfileId, at?.trim() || null, depth),
  ]);
  const totalEarned = summary.levels.reduce((s, l) => s + Number(l.earned), 0).toFixed(2);
  const { placement, tree, center } = team;
  const atHref = (code: string, d: number) => `/office/team?at=${encodeURIComponent(code)}&depth=${d}`;
  const depthHref = (d: number) => (center.isMe ? `/office/team?depth=${d}` : atHref(center.code, d));
  const upIsMe = !tree?.upTo || tree.upTo.id === ctx.memberProfileId;

  return (
    <>
      <h1 className="font-serif text-2xl font-medium tracking-tight text-slate-900">My Team</h1>
      <p className="mt-1 text-sm text-slate-500">
        Your binary team: everyone on your left and your right, in one chart. Tap anyone to look at their team.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { l: "Total team", v: String(summary.totals.totalTeam), h: `${summary.totals.directReferrals} referred by you` },
          { l: "Joined this month", v: String(summary.totals.joinedThisMonth), h: `Depth: L${summary.totals.deepestLevel}` },
          { l: "Team earnings", v: formatINR(totalEarned), h: "Credited, all levels" },
        ].map((s) => (
          <div key={s.l} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{s.l}</p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums text-slate-900">{s.v}</p>
            <p className="text-xs text-slate-500">{s.h}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Your code</p>
          <p className="mt-0.5 font-mono font-semibold text-teal-700">{ctx.memberCode}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Referred by</p>
          <p className="mt-0.5 text-slate-700">
            {placement.referredBy ? (
              <>
                {placement.referredBy.name ?? "—"}{" "}
                <span className="font-mono text-xs text-slate-400">{placement.referredBy.code}</span>
              </>
            ) : (
              "—"
            )}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Your position</p>
          <p className="mt-0.5 text-slate-700">
            {placement.placedUnder ? (
              <>
                {placement.leg === "LEFT" ? "Left" : "Right"} of{" "}
                <span className="font-mono text-xs text-slate-500">{placement.placedUnder.code}</span>
              </>
            ) : (
              "Top of the network"
            )}
          </p>
        </div>
      </div>

      {!placement.binary ? (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Your team chart will appear here as soon as the network moves to the new left/right plan. Your team by level is
          shown below in the meantime.
        </p>
      ) : summary.totals.totalTeam === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">Your team is empty for now</p>
          <p className="mt-1 text-sm text-slate-500">
            Share your left-team or right-team link from{" "}
            <Link href="/office/referrals" className="text-teal-700 hover:underline">
              Sponsoring
            </Link>{" "}
            — everyone who joins with it lands on the side you choose.
          </p>
        </div>
      ) : (
        <>
          {team.summary ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_minmax(0,15rem)_1fr]">
              <LegCard leg={team.summary.left} tone="left" />
              <div className="flex flex-col justify-center rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                <Scale className="mx-auto mb-1 h-4 w-4 text-slate-400" />
                <p className="text-xs text-slate-500">
                  {team.summary.weaker === "EVEN"
                    ? "Both teams level"
                    : `Weaker team: ${team.summary.weaker === "LEFT" ? "left" : "right"}`}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                  {formatINR(team.summary.payableVolume)}
                </p>
                <p className="text-xs text-slate-500">volume you&rsquo;re paid on</p>
                <p className="mt-2 text-[11px] leading-snug text-slate-400">
                  You&rsquo;re paid on your weaker team&rsquo;s volume, so growing the smaller side is what moves this
                  number.
                </p>
              </div>
              <LegCard leg={team.summary.right} tone="right" />
            </div>
          ) : null}

          {tree ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-medium text-slate-600">
                  {center.isMe ? "Team chart" : `Team of ${tree.nodes[0]?.name ?? center.code}`}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {!center.isMe ? (
                    <Link
                      href={upIsMe ? `/office/team?depth=${depth}` : atHref(tree.upTo!.memberCode, depth)}
                      className="inline-flex items-center gap-1 text-teal-700 hover:underline"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                      {upIsMe ? "Back to my team" : `Up to ${tree.upTo!.name}`}
                    </Link>
                  ) : null}
                  <div className="inline-flex items-center gap-1 rounded-md border p-0.5" role="group" aria-label="Levels shown">
                    {Array.from({ length: MAX_TREE_DEPTH - 1 }, (_, i) => i + 2).map((d) => (
                      <Link
                        key={d}
                        href={depthHref(d)}
                        aria-current={d === depth ? "true" : undefined}
                        className={cn(
                          "rounded px-2 py-0.5 text-xs",
                          d === depth ? "bg-teal-700 text-white" : "text-slate-500 hover:bg-slate-100",
                        )}
                      >
                        {d} levels
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
              <GenealogyTree tree={tree} showContact={false} hrefFor={(n, d) => atHref(n.memberCode, d)} />
            </div>
          ) : null}
        </>
      )}

      {upline.length > 0 ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Your upline</p>
          <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-slate-600">
            {upline
              .slice()
              .reverse()
              .map((u, i) => (
                <li key={u.memberCode} className="flex items-center gap-1">
                  {i > 0 ? <span className="text-slate-300">›</span> : null}
                  <span className="font-mono">{u.memberCode}</span>
                  <span className="text-slate-400">(L{u.level})</span>
                </li>
              ))}
            <li className="flex items-center gap-1">
              <span className="text-slate-300">›</span>
              <span className="rounded bg-teal-50 px-1.5 font-mono font-semibold text-teal-700">{ctx.memberCode}</span>
            </li>
          </ol>
        </div>
      ) : null}

      {summary.totals.totalTeam > 0 ? (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-medium text-slate-500">Team by level</h2>
          <NetworkLevels levels={summary.levels} />
        </div>
      ) : null}
    </>
  );
}
