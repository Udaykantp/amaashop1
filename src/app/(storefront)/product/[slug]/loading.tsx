export default function ProductLoading() {
  return (
    <div className="mx-auto max-w-7xl px-3 py-4 lg:px-8 lg:py-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="aspect-square animate-skeleton rounded-xl bg-neutral-100" />
        <div>
          <div className="h-7 w-3/4 animate-skeleton rounded bg-neutral-100" />
          <div className="mt-3 h-4 w-1/2 animate-skeleton rounded bg-neutral-100" />
          <div className="mt-4 h-8 w-1/3 animate-skeleton rounded bg-neutral-100" />
          <div className="mt-6 h-24 w-full animate-skeleton rounded-xl bg-neutral-100" />
          <div className="mt-6 h-11 w-full animate-skeleton rounded-lg bg-neutral-100" />
        </div>
      </div>
    </div>
  );
}
