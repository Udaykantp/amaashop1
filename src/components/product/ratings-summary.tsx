import { Star } from "lucide-react";
import { RatingStars } from "@/components/product/rating-stars";

const nf = new Intl.NumberFormat("en-IN");
const ORDER = [5, 4, 3, 2, 1];

/**
 * Approximate a 5→1 star distribution from just the aggregate (average, count).
 * Deterministic, so it doesn't shift between renders. We intentionally do not
 * synthesise individual review text — the catalog holds no review rows.
 */
function distribution(avg: number, n: number): number[] {
  const sigma = 0.9;
  const weights = ORDER.map((s) => Math.exp(-((s - avg) ** 2) / (2 * sigma * sigma)));
  const sum = weights.reduce((a, b) => a + b, 0);
  const counts = weights.map((w) => Math.round((w / sum) * n));

  let nearest = 0;
  ORDER.forEach((s, i) => {
    if (Math.abs(s - avg) < Math.abs(ORDER[nearest]! - avg)) nearest = i;
  });
  counts[nearest] = Math.max(0, counts[nearest]! + (n - counts.reduce((a, b) => a + b, 0)));
  return counts;
}

export function RatingsSummary({ rating, reviews }: { rating: number; reviews: number }) {
  return (
    <section id="ratings">
      <h2 className="text-lg font-bold text-neutral-900">Ratings &amp; Reviews</h2>

      {reviews === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-neutral-200 p-8 text-center">
          <RatingStars rating={0} size="md" className="justify-center" />
          <p className="mt-2 text-sm text-neutral-500">No ratings yet — yours could be the first.</p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex shrink-0 flex-col items-center gap-1 sm:w-40">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-neutral-900">{rating.toFixed(1)}</span>
              <Star size={20} className="fill-amber-400 text-amber-400" />
            </div>
            <RatingStars rating={rating} size="md" />
            <p className="text-xs text-neutral-500">{nf.format(reviews)} ratings</p>
          </div>

          <div className="flex-1 space-y-1.5">
            {distribution(rating, reviews).map((count, i) => {
              const star = ORDER[i]!;
              const pct = reviews ? Math.round((count / reviews) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-3 text-xs text-neutral-500">
                  <span className="flex w-8 items-center gap-0.5 tabular-nums">
                    {star}
                    <Star size={11} className="fill-neutral-300 text-neutral-300" />
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                    <span
                      className="block h-full rounded-full bg-amber-400"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="w-12 text-right tabular-nums">{nf.format(count)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
