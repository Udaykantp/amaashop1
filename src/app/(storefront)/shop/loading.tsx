import { ProductGridSkeleton } from "@/components/skeletons/product-skeletons";

export default function ShopLoading() {
  return (
    <div className="mx-auto max-w-7xl px-3 py-4 lg:px-8 lg:py-8">
      <div className="h-6 w-40 animate-skeleton rounded bg-neutral-100" />
      <div className="mt-4">
        <ProductGridSkeleton count={8} />
      </div>
    </div>
  );
}
