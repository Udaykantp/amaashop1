import type { PublicProductDetail } from "@/lib/data/products";

function formatWeight(grams: number): string {
  return grams >= 1000 ? `${(grams / 1000).toFixed(grams % 1000 === 0 ? 0 : 2)} kg` : `${grams} g`;
}

type Row = { label: string; value: string };

export function ProductSpecs({ product }: { product: PublicProductDetail }) {
  const general: Row[] = [];
  if (product.brand) general.push({ label: "Brand", value: product.brand });
  if (product.sku) general.push({ label: "Model / SKU", value: product.sku });
  general.push({ label: "In the box", value: product.name });
  if (product.unit) general.push({ label: "Net quantity", value: product.unit });
  if (product.categories?.name) general.push({ label: "Category", value: product.categories.name });

  const additional: Row[] = [];
  if (product.weightGrams)
    additional.push({ label: "Weight", value: formatWeight(product.weightGrams) });
  if (product.hsnCode) additional.push({ label: "HSN code", value: product.hsnCode });
  if (product.gstRateBps)
    additional.push({ label: "GST rate", value: `${(product.gstRateBps / 100).toFixed(0)}%` });
  if (product.gtin) additional.push({ label: "GTIN / Barcode", value: product.gtin });

  const groups = [
    { title: "General", rows: general },
    { title: "Additional information", rows: additional },
  ].filter((g) => g.rows.length > 0);

  if (groups.length === 0) return null;

  return (
    <section id="specifications">
      <h2 className="text-lg font-bold text-neutral-900">Specifications</h2>
      <div className="mt-4 space-y-6">
        {groups.map((group) => (
          <div key={group.title}>
            <h3 className="text-sm font-semibold text-neutral-700">{group.title}</h3>
            <table className="mt-2 w-full border-collapse text-sm">
              <tbody>
                {group.rows.map((row) => (
                  <tr key={row.label} className="border-b border-neutral-100 last:border-0">
                    <th
                      scope="row"
                      className="w-2/5 py-2.5 pr-4 text-left align-top font-medium text-neutral-500"
                    >
                      {row.label}
                    </th>
                    <td className="py-2.5 align-top text-neutral-800">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </section>
  );
}
