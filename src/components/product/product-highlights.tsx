import { Check } from "lucide-react";
import type { PublicProductDetail } from "@/lib/data/products";

function formatWeight(grams: number): string {
  return grams >= 1000 ? `${(grams / 1000).toFixed(grams % 1000 === 0 ? 0 : 2)} kg` : `${grams} g`;
}

/** Key facts, built only from fields the catalog actually holds. */
export function ProductHighlights({ product }: { product: PublicProductDetail }) {
  const points: string[] = [];

  if (product.brand) points.push(`Brand: ${product.brand}`);
  if (product.unit) points.push(`Net quantity: ${product.unit}`);
  if (product.weightGrams) points.push(`Weight: ${formatWeight(product.weightGrams)}`);
  if (product.categories?.name) points.push(`Category: ${product.categories.name}`);
  if (product.subtitle) points.push(product.subtitle);

  if (points.length === 0) return null;

  return (
    <section className="mt-6 border-t border-neutral-100 pt-5">
      <h2 className="text-sm font-semibold text-neutral-900">Highlights</h2>
      <ul className="mt-2 space-y-1.5">
        {points.map((point) => (
          <li key={point} className="flex gap-2 text-sm text-neutral-600">
            <Check size={16} className="mt-0.5 shrink-0 text-emerald-600" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
