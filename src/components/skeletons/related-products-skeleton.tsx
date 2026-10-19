import { ProductCardSkeleton } from "@/components/skeletons/product-skeletons";

export function RelatedProductsSkeleton() {
  return (
    <section className="mt-10 lg:mt-16">
      <div className="mx-3 h-6 w-40 animate-skeleton rounded bg-neutral-100 lg:mx-0" />
      <div className="mt-4 grid grid-cols-2 gap-3 px-3 lg:mt-6 lg:grid-cols-4 lg:px-0">
        {Array.from({ length: 4 }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}
