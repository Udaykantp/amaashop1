# Binary plan — how the genealogy works

The network is a **binary tree**: every distributor has exactly two frontline
slots, LEFT and RIGHT. A third recruit cannot sit directly under the same person,
so they **spill over** beneath one of the two.

## Two different relationships

| Field (`member_profiles`) | Meaning | Changes when… |
|---|---|---|
| `sponsorId` | who **referred** them (referral credit) | never — not on spillover, not on a move |
| `placementParentId` + `leg` | where they **sit** in the tree | spillover at join, admin re-placement, termination compression |

`network_closure` (ancestor → descendant + depth) follows **placement**, so "team",
"levels" and the leg totals all mean the binary tree.

## Placement rules (`src/lib/network/binary-slot.ts`, `src/server/network/placement.ts`)

1. The enroller picks a side: **Left**, **Right**, or **Auto** (default).
   *Auto* fills an empty slot first (left before right), otherwise feeds the
   sponsor's **weaker** leg (fewer members), ties go left.
2. If the sponsor's own slot on that side is free, the newcomer takes it.
3. Otherwise they take the first vacant slot inside that leg, searching level by
   level, left to right — so a leg fills evenly instead of growing one long chain.
4. Placement runs inside the join transaction; concurrent joins under one sponsor
   are retried on Firestore lock contention.

## Weaker-leg pay

`/admin/network` (and the distributor's own **My Team** page) show, for a
distributor: members and **business volume (BV)** per leg, the weaker leg, and the
**commissionable volume** (= the smaller side, the stronger side's surplus shown as carry).
Volume = Σ (item quantity × the product's **BV**, set in the catalog) over
CONFIRMED / PROCESSING / SHIPPED / DELIVERED orders placed by members in that leg —
so shelf price, GST, shipping and discounts don't move it; cancelled, refunded and pending orders don't count.

> The commission **engine** (rates, matching cycles, carry-forward rules, caps) is
> not built yet and the rates are still `[CONFIRM]` in `COMMISSION-PLAN.md`. The
> page shows the volumes the rule pays on; it does not pay anything.

## Referral links carry a side

A distributor's link can be an **Any side** link or a **Left team** / **Right team**
link (`?ref=AMA-XXXXXX&leg=left|right`, picked in the referral-share widget). The
side rides with the ref (cookie `amaasop_leg`), is stored on the application as
`preferredLeg`, and is only a *request*: the placement engine still spills over if that
slot is taken, and an admin can override it when approving (**Place on**). The
signed-in `/member/join` path honours it too.

## Where "direct" means what

- **Referred** / "direct referrals" everywhere = people they personally referred (`sponsorId`).
- **Frontline** = the (up to 2) members sitting directly under them in the tree.
- **Team** = everyone below them in the tree; **Level N** = N steps below them in the tree.

## Screens

| Screen | What it shows |
|---|---|
| Admin → Distributors (`/admin/members`) | Referred by · Placed under (+ Left/Right) · Team L·R · Referred count; search by name, mobile, e-mail or AMA code |
| Admin → Distributor detail | Referred by, placement, frontline, personally referred; Left & right team card (members, BV, weaker leg) with a link to the tree |
| Admin → Referrers | Recruitment activity by *referred* count (not tree position) |
| Admin → Registrations (approve) | Requested side + **Place on** Auto/Left/Right |
| Distributor back-office → My Team | Own position, left/right cards, read-only chart of their team (re-centre only inside their own downline; no mobile numbers or referrer details), team by level |
| Distributor back-office → Sponsoring | Any-side / left-team / right-team link + QR |

## Admin operations

- **Find** by AMA referral ID, 10-digit mobile, or name/e-mail (`/admin/network`).
- **Add distributor** (`/admin/members/new`) — choose Auto / Left / Right; the
  result says where they landed and whether they spilled over.
- **Re-place** (move tool) — put a member + their whole team in an **empty** slot
  under another distributor. Refused if the slot is taken or the target is inside
  the moving team. Needs `network.move` + 2FA; audited.
- **Terminate** — one child steps into the slot; with two children the left one
  steps up and the right one (with their team) goes to the first vacant slot in
  the left one's team. The root can't be terminated while it has a team.

## Converting an existing (unilevel) network

```bash
npm run network:migrate-binary              # dry run: shows who keeps a parent / who spills
npm run network:migrate-binary:apply   # writes a JSON backup, then converts
```

Replays members in join order under their sponsors with the rules above, rewrites
`placementParentId` / `leg` / `placementStrategy` and rebuilds `network_closure`.
`sponsorId` is never touched. Run it while nobody is enrolling: until it finishes,
joins under an unconverted sponsor are refused (`NEEDS_MIGRATION`). Re-running is safe: if
every member is already binary it does nothing, and a mixed state stops and asks for `--force`.

## Checks

- `npx vitest run src/lib/network` — slot algorithm (spillover order, no double-booked slot, holes reused, auto-leg, weaker-leg).
- `npm run verify` (Firestore emulator) — closure integrity, ≤ 1 member per slot, spillover in the seed data, move + reverse.
