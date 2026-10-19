import { getRelatedProducts } from "@/lib/data/products";
import { ProductCard } from "@/components/product/product-card";

export async function RelatedProducts({ categoryId, excludeId }: { categoryId: string; excludeId: string }) {
  const related = await getRelatedProducts(categoryId, excludeId);
  if (related.length === 0) return null;

  return (
    <section className="mt-10 lg:mt-16">
      <h2 className="px-3 text-lg font-bold text-neutral-800 lg:px-0 lg:text-xl">Related Products</h2>
      <div className="mt-4 flex gap-3 overflow-x-auto no-scrollbar px-3 pb-1 lg:mt-6 lg:grid lg:grid-cols-4 lg:gap-3 lg:overflow-visible lg:px-0 lg:pb-0">
        {related.map((product) => (
          <div key={product.id} className="w-36 shrink-0 lg:w-auto">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
