import "server-only";
import { slugify } from "@/lib/catalog/slugify";
import { Collections, db } from "@/server/firestore";

export { slugify };

/**
 * A slug guaranteed unique across `products`. Appends `-2`, `-3`, … on
 * collision. `excludeId` lets an edit keep its own slug.
 */
export async function uniqueProductSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || "product";
  let candidate = root;
  for (let n = 2; ; n++) {
    const snap = await db().collection(Collections.products).where("slug", "==", candidate).limit(2).get();
    const clash = snap.docs.some((d) => d.id !== excludeId);
    if (!clash) return candidate;
    candidate = `${root}-${n}`;
  }
}

/**
 * A SKU guaranteed unique across `products`. Given a base (usually derived from
 * the name) produces `BASE`, `BASE-2`, … `excludeId` lets an edit keep its own.
 */
export async function uniqueProductSku(base: string, excludeId?: string): Promise<string> {
  const root =
    base
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "SKU";
  let candidate = root;
  for (let n = 2; ; n++) {
    const snap = await db().collection(Collections.products).where("sku", "==", candidate).limit(2).get();
    const clash = snap.docs.some((d) => d.id !== excludeId);
    if (!clash) return candidate;
    candidate = `${root}-${n}`;
  }
}
