"use client";

import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { WishlistToggleButton } from "@/components/product/wishlist-toggle-button";
import { calculateDiscount } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

type GalleryImage = { url: string; alt: string | null };

/**
 * PDP media gallery.
 *  - Mobile: a full-width, swipeable scroll-snap carousel with dot indicators
 *    (thumb-friendly, matches native shopping apps).
 *  - Tablet/desktop: a thumbnail rail + single main image, hover to switch.
 *  - Both: tap to open a full-screen lightbox with keyboard nav.
 * The first image is the LCP element, so it renders with `priority`.
 */
export function ProductGallery({
  product,
  images,
}: {
  product: Product;
  images: GalleryImage[];
}) {
  const gallery: GalleryImage[] =
    images.length > 0 ? images : [{ url: product.image_url, alt: product.name }];

  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const discount = calculateDiscount(product.price, product.old_price);

  const index = Math.min(active, gallery.length - 1);
  const current: GalleryImage = gallery[index] ?? gallery[0]!;
  const multi = gallery.length > 1;

  const go = useCallback(
    (dir: 1 | -1) => setActive((i) => (i + dir + gallery.length) % gallery.length),
    [gallery.length],
  );

  // Mobile carousel → keep the active dot in sync with the scroll position.
  const onTrackScroll = () => {
    const el = trackRef.current;
    if (!el || !el.clientWidth) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setActive((prev) => (prev === idx ? prev : idx));
  };

  // A tap on a dot / thumb / lightbox arrow → scroll the mobile track to match.
  useEffect(() => {
    const el = trackRef.current;
    if (!el || !el.clientWidth) return;
    const target = index * el.clientWidth;
    if (Math.abs(el.scrollLeft - target) > 4) el.scrollTo({ left: target, behavior: "smooth" });
  }, [index]);

  // Lightbox: lock scroll + wire keyboard.
  useEffect(() => {
    if (!lightbox) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightbox, go]);

  return (
    <>
      {/* ── Mobile: swipe carousel ─────────────────────────────────────────── */}
      <div className="sm:hidden">
        <div className="relative overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50">
          <div
            ref={trackRef}
            onScroll={onTrackScroll}
            className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
          >
            {gallery.map((img, i) => (
              <button
                key={`${img.url}-${i}`}
                type="button"
                onClick={() => setLightbox(true)}
                aria-label={`Image ${i + 1} of ${gallery.length} — tap to zoom`}
                className="relative aspect-square w-full shrink-0 snap-center"
              >
                <Image
                  src={img.url}
                  alt={img.alt ?? product.name}
                  fill
                  sizes="100vw"
                  priority={i === 0}
                  className="object-cover"
                />
              </button>
            ))}
          </div>

          {product.badge && (
            <span className="absolute left-3 top-3 rounded bg-red-500 px-2.5 py-1 text-xs font-semibold text-white">
              {product.badge}
            </span>
          )}
          {discount > 0 && (
            <span className="absolute right-3 top-3 rounded bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-white">
              -{discount}% OFF
            </span>
          )}
          {multi && (
            <span className="absolute bottom-3 right-3 rounded-full bg-neutral-900/70 px-2 py-0.5 text-[11px] font-medium text-white">
              {index + 1}/{gallery.length}
            </span>
          )}
          <WishlistToggleButton product={product} variant="overlay" />
        </div>

        {multi && (
          <div className="mt-3 flex justify-center gap-1.5">
            {gallery.map((img, i) => (
              <button
                key={`${img.url}-dot-${i}`}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Go to image ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-5 bg-emerald-600" : "w-1.5 bg-neutral-300",
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Tablet / desktop: thumb rail + main image ──────────────────────── */}
      <div className="hidden gap-3 sm:flex">
        {multi && (
          <div className="flex flex-col gap-2">
            {gallery.map((img, i) => (
              <button
                key={`${img.url}-thumb-${i}`}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => setActive(i)}
                aria-label={`View image ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-neutral-50 transition-colors",
                  i === index
                    ? "border-emerald-500 ring-1 ring-emerald-500"
                    : "border-neutral-200 hover:border-neutral-300",
                )}
              >
                <Image src={img.url} alt={img.alt ?? ""} fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="relative aspect-square min-w-0 flex-1 overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50">
          <Image
            key={current.url}
            src={current.url}
            alt={current.alt ?? product.name}
            fill
            sizes="(min-width: 1024px) 45vw, 90vw"
            priority
            className="object-cover"
          />

          {product.badge && (
            <span className="absolute left-3 top-3 rounded bg-red-500 px-3 py-1 text-xs font-semibold text-white">
              {product.badge}
            </span>
          )}
          {discount > 0 && (
            <span className="absolute right-3 top-3 rounded bg-neutral-900 px-3 py-1 text-xs font-semibold text-white">
              -{discount}% OFF
            </span>
          )}

          <button
            type="button"
            onClick={() => setLightbox(true)}
            aria-label="Open full-screen image"
            className="absolute bottom-3 left-3 flex h-9 items-center gap-1.5 rounded-full bg-white/90 px-3 text-xs font-medium text-neutral-700 shadow-sm ring-1 ring-black/5 backdrop-blur-sm hover:bg-white"
          >
            <Expand size={14} />
            View
          </button>

          <WishlistToggleButton product={product} variant="overlay" />
        </div>
      </div>

      {/* ── Lightbox ──────────────────────────────────────────────────────── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-950/90 p-4"
          onClick={() => setLightbox(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`${product.name} images`}
        >
          <button
            type="button"
            onClick={() => setLightbox(false)}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X size={20} />
          </button>

          {multi && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                aria-label="Previous image"
                className="absolute left-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                aria-label="Next image"
                className="absolute right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <ChevronRight size={22} />
              </button>
            </>
          )}

          <div className="relative h-[80vh] w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <Image
              src={current.url}
              alt={current.alt ?? product.name}
              fill
              sizes="(min-width: 768px) 768px, 100vw"
              className="object-contain"
            />
          </div>

          {multi && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
              {index + 1} / {gallery.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}
