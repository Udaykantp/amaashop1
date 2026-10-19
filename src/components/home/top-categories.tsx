import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CategoryIcon } from "@/components/product/category-icon";
import type { Category } from "@/lib/types";

export function TopCategories({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;

  return (
    <section className="mt-2 border-t border-neutral-100 px-3 py-6 lg:mx-auto lg:mt-0 lg:max-w-7xl lg:border-t-0 lg:px-8 lg:py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-neutral-900 lg:text-2xl">
            Shop by category
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500 lg:text-sm">
            Everyday essentials, sorted into aisles
          </p>
        </div>
        <Link
          href="/shop"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition-colors hover:border-emerald-300 hover:text-emerald-700 lg:text-sm"
        >
          View all
          <ArrowRight size={14} />
        </Link>
      </div>

      <ul className="mt-5 grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-6 lg:mt-6 lg:grid-cols-8">
        {categories.map((category) => (
          <li key={category.id}>
            <Link
              href={`/shop?category=${encodeURIComponent(category.name)}`}
              aria-label={`Browse ${category.name}${
                category.productCount ? ` — ${category.productCount} products` : ""
              }`}
              className="group flex flex-col items-center gap-2 text-center focus-visible:outline-none"
            >
              <span className="relative aspect-square w-full overflow-hidden rounded-[28%] bg-lime-100 shadow-[0_10px_20px_-8px_rgba(101,163,13,0.45)] ring-1 ring-lime-200/70 transition-transform duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_16px_24px_-10px_rgba(101,163,13,0.55)] group-focus-visible:ring-2 group-focus-visible:ring-emerald-500">
                {category.images && category.images.length > 0 ? (
                  <>
                    <Image
                      src={category.images[0]!}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 12vw, (min-width: 640px) 22vw, 30vw"
                      className="object-cover"
                    />
                    {category.images[1] ? (
                      <span className="absolute bottom-1 right-1 h-[44%] w-[44%] overflow-hidden rounded-xl ring-2 ring-white sm:bottom-1.5 sm:right-1.5">
                        <Image
                          src={category.images[1]}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 6vw, (min-width: 640px) 10vw, 14vw"
                          className="object-cover"
                        />
                      </span>
                    ) : null}
                  </>
                ) : (
                  <CategoryIcon
                    iconKey={category.icon}
                    className="absolute inset-0 m-auto h-8 w-8 text-lime-700 sm:h-9 sm:w-9"
                  />
                )}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="line-clamp-2 text-xs font-bold leading-tight text-neutral-900 sm:text-sm">
                  {category.name}
                </span>
                {typeof category.productCount === "number" && category.productCount > 0 ? (
                  <span className="mt-0.5 text-[10px] text-neutral-400 sm:text-xs">
                    {category.productCount} {category.productCount === 1 ? "item" : "items"}
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
