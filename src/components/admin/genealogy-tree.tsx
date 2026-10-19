import Link from "next/link";
import { CenteredScroller } from "@/components/admin/centered-scroller";
import { cn } from "@/lib/utils";
import type { BinaryTree, BinaryTreeNode } from "@/server/network/binary-tree";

/**
 * The genealogy chart: one member at the top, their LEFT and RIGHT people
 * beneath, and so on down `tree.depth` rows. It is laid out on a fixed
 * complete-binary grid, so a member's left leg is always on the left of the
 * page and their right leg on the right, and an empty position is drawn as an
 * open slot instead of collapsing the picture.
 *
 * Server-rendered: every card is a link that re-centres the chart on that
 * member, so drilling into a deep leg needs no client state.
 */

const SLOT_W = 132; // horizontal room per leaf column (3 levels = 8 columns fit the page without scrolling)
const CARD_W = 120;
const ROOT_W = 168; // the chart's focus member has room to spare above the first split
const CARD_H = 92;
const ROW_H = 132;

type Side = "LEFT" | "RIGHT" | null;

interface Placed {
  node: BinaryTreeNode;
  index: number; // position in the complete binary grid at this level
  side: Side; // which of the root's two legs this member belongs to
}

interface OpenSlot {
  level: number;
  index: number;
  parentIndex: number;
  leg: "LEFT" | "RIGHT";
  side: Side;
}

const STATUS_DOT: Record<string, string> = {
  ACTIVE: "bg-success",
  PENDING_KYC: "bg-warning",
  SUSPENDED: "bg-destructive",
  TERMINATED: "bg-destructive",
};

function tooltip(n: BinaryTreeNode, showContact: boolean) {
  return [
    `${n.name} (${n.memberCode})`,
    showContact && n.phone ? `Mobile: ${n.phone}` : null,
    showContact ? (n.sponsorCode ? `Referred by: ${n.sponsorCode}` : "Referred by: — (root)") : null,
    `Joined: ${new Date(n.joinedAt).toLocaleDateString("en-IN")}`,
    `Status: ${n.status.replace("_", " ").toLowerCase()}`,
    n.leftCount + n.rightCount > 0 ? `Team: ${n.leftCount} left · ${n.rightCount} right` : "No team yet",
    "Click to centre the chart on this member",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * `hrefFor` decides where a card links (default: the admin tree, re-centred on
 * that member). `showContact` adds mobile + referrer to the hover text — leave it
 * off anywhere the viewer isn't staff (the data is also stripped server-side).
 */
export function GenealogyTree({
  tree,
  hrefFor = (n, depth) => `/admin/network?q=${encodeURIComponent(n.memberCode)}&depth=${depth}`,
  showContact = true,
}: {
  tree: BinaryTree;
  hrefFor?: (node: BinaryTreeNode, depth: number) => string;
  showContact?: boolean;
}) {
  const { depth } = tree;
  const leaves = 2 ** depth;
  const width = leaves * SLOT_W;
  const height = depth * ROW_H + CARD_H;

  const byId = new Map(tree.nodes.map((n) => [n.id, n]));
  const root = tree.nodes[0]!;

  const placed: Placed[] = [];
  const slots: OpenSlot[] = [];
  const edges: { from: Placed; to: { level: number; index: number }; open: boolean }[] = [];

  const walk = (node: BinaryTreeNode, index: number, side: Side) => {
    const me: Placed = { node, index, side };
    placed.push(me);
    if (node.level >= depth) return;
    for (const leg of ["LEFT", "RIGHT"] as const) {
      const childId = leg === "LEFT" ? node.leftId : node.rightId;
      const childIndex = index * 2 + (leg === "RIGHT" ? 1 : 0);
      const childSide = node.level === 0 ? leg : side;
      const child = childId ? byId.get(childId) : undefined;
      if (child) {
        edges.push({ from: me, to: { level: node.level + 1, index: childIndex }, open: false });
        walk(child, childIndex, childSide);
      } else {
        edges.push({ from: me, to: { level: node.level + 1, index: childIndex }, open: true });
        slots.push({ level: node.level + 1, index: childIndex, parentIndex: index, leg, side: childSide });
      }
    }
  };
  walk(root, 0, null);

  const cx = (level: number, index: number) => (index + 0.5) * 2 ** (depth - level) * SLOT_W;
  const top = (level: number) => level * ROW_H;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> Left leg
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-warning" /> Right leg
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-success" /> Active
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-warning" /> KYC pending
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-destructive" /> Suspended
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-5 rounded border border-dashed" /> Open slot
        </span>
      </div>

      <CenteredScroller className="rounded-lg border bg-muted/20 pb-2">
        <div className="mx-auto px-2 pt-4" style={{ width: width + 16 }}>
          {/* leg headings over each half of the chart */}
          <div className="mb-3 flex" style={{ width }}>
            <div className="w-1/2 border-b-2 border-primary/60 pb-1 text-center text-[11px] font-semibold uppercase tracking-wider text-primary">
              Left leg · {root.leftCount} {root.leftCount === 1 ? "member" : "members"}
            </div>
            <div className="w-1/2 border-b-2 border-warning/70 pb-1 text-center text-[11px] font-semibold uppercase tracking-wider text-warning">
              Right leg · {root.rightCount} {root.rightCount === 1 ? "member" : "members"}
            </div>
          </div>

          <div className="relative" style={{ width, height }}>
            <svg width={width} height={height} className="absolute inset-0 text-muted-foreground/40" aria-hidden>
              {edges.map((e, i) => {
                const fromLevel = e.from.node.level;
                const x1 = cx(fromLevel, e.from.index);
                const y1 = top(fromLevel) + CARD_H;
                const x2 = cx(e.to.level, e.to.index);
                const y2 = top(e.to.level);
                const mid = y1 + (y2 - y1) / 2;
                return (
                  <path
                    key={i}
                    d={`M${x1} ${y1} V${mid} H${x2} V${y2}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeDasharray={e.open ? "4 4" : undefined}
                    strokeLinejoin="round"
                  />
                );
              })}
            </svg>

            {slots.map((s) => (
              <div
                key={`slot-${s.level}-${s.index}`}
                className="absolute flex items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 text-[11px] text-muted-foreground/70"
                style={{ left: cx(s.level, s.index) - CARD_W / 2, top: top(s.level), width: CARD_W, height: 44 }}
                title={`Open ${s.leg.toLowerCase()} slot`}
              >
                Open · {s.leg === "LEFT" ? "Left" : "Right"}
              </div>
            ))}

            {placed.map(({ node, index, side }) => {
              const isRoot = node.level === 0;
              const cardW = isRoot ? ROOT_W : CARD_W;
              const hasHidden = node.level === depth && node.leftCount + node.rightCount > 0;
              const card = (
                <div
                  className={cn(
                    "flex flex-col justify-between rounded-lg border border-t-[3px] bg-card p-2 text-left shadow-sm transition-shadow",
                    side === "LEFT" && "border-t-primary",
                    side === "RIGHT" && "border-t-warning",
                    isRoot && "border-t-foreground ring-2 ring-primary/30",
                    !isRoot && "hover:shadow-md",
                  )}
                  style={{ width: cardW, height: CARD_H }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_DOT[node.status] ?? "bg-muted-foreground")} />
                    <span className="truncate text-[13px] font-medium leading-tight">{node.name}</span>
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground">{node.memberCode}</span>
                  <div className="flex items-center justify-between gap-1 text-[11px] tabular-nums">
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">L {node.leftCount}</span>
                    {hasHidden ? <span className="text-[10px] text-muted-foreground">▼ more</span> : null}
                    <span className="rounded bg-warning/15 px-1.5 py-0.5 text-warning">R {node.rightCount}</span>
                  </div>
                </div>
              );
              return (
                <div
                  key={node.id}
                  className="absolute"
                  style={{ left: cx(node.level, index) - cardW / 2, top: top(node.level) }}
                >
                  {isRoot ? (
                    <div title={tooltip(node, showContact)}>{card}</div>
                  ) : (
                    <Link
                      href={hrefFor(node, depth)}
                      title={tooltip(node, showContact)}
                      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {card}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CenteredScroller>
    </div>
  );
}
