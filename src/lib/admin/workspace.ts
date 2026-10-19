/**
 * The admin console has two working contexts that rarely overlap in a session:
 *
 *   • "store"   — e-commerce: catalog, autoship kits, customer orders
 *   • "mlm"     — the distributor network: genealogy, KYC, commissions, payouts
 *
 * A sidebar toggle switches between them so each operator sees only the
 * sections relevant to the job in front of them. The choice is remembered in
 * a cookie (scoped to `/admin`) and read server-side by the layout so there's
 * no flash of the wrong menu on load.
 *
 * Pure module — imported by both the client nav and the server layout.
 */

export type AdminWorkspace = "store" | "mlm";

export const ADMIN_WORKSPACE_COOKIE = "amaashop_admin_ws";
export const DEFAULT_WORKSPACE: AdminWorkspace = "store";

export function parseWorkspace(value: string | undefined | null): AdminWorkspace {
  return value === "mlm" || value === "store" ? value : DEFAULT_WORKSPACE;
}

export const WORKSPACE_META: Record<
  AdminWorkspace,
  { label: string; short: string; title: string }
> = {
  store: {
    label: "Store",
    short: "E-commerce",
    title: "E-commerce — catalog, autoship kits, customer orders",
  },
  mlm: {
    label: "MLM",
    short: "Network",
    title: "Distributor network — registrations, ID checks, commissions, payouts",
  },
};
