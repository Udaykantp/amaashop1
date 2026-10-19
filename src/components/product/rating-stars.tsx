import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  rating: number;
  reviews?: number;
  size?: "sm" | "md";
  className?: string;
}

/** Pure presentational — no interactivity, safe to render on the server. */
export function RatingStars({ rating, reviews, size = "sm", className }: RatingStarsProps) {
  const starSize = size === "sm" ? 14 : 18;
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center gap-0.5" role="img" aria-label={`Rated ${rating} out of 5`}>
        {Array.from({ length: 5 }, (_, i) => {
          const isFull = i < fullStars;
          const isHalf = i === fullStars && hasHalf;
          return (
            <Star
              key={i}
              size={starSize}
              aria-hidden="true"
              className={cn(
                isFull || isHalf ? "fill-amber-400 text-amber-400" : "fill-neutral-200 text-neutral-200",
              )}
            />
          );
        })}
      </div>
      {reviews !== undefined && <span className="text-xs text-neutral-500">({reviews})</span>}
    </div>
  );
}
