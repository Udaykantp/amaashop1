export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-sm">
      <div className="aspect-square animate-skeleton bg-neutral-100" />
      <div className="flex flex-col p-3">
        <div className="h-3 w-full animate-skeleton rounded bg-neutral-100" />
        <div className="mt-2 h-3 w-2/3 animate-skeleton rounded bg-neutral-100" />
        <div className="mt-3 h-4 w-1/2 animate-skeleton rounded bg-neutral-100" />
        <div className="mt-3 h-8 w-full animate-skeleton rounded-lg bg-neutral-100" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProductRowSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 lg:gap-4">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function CategorySkeleton() {
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 md:grid-cols-6 lg:grid-cols-8">
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className="flex flex-col items-center gap-2.5 rounded-2xl border border-neutral-100 bg-white p-3 shadow-sm sm:p-4"
        >
          <div className="h-14 w-14 animate-skeleton rounded-2xl bg-neutral-100 sm:h-16 sm:w-16" />
          <div className="h-3 w-14 animate-skeleton rounded bg-neutral-100" />
        </div>
      ))}
    </div>
  );
}
