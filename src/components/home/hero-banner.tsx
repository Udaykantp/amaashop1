"use client";

import { ArrowRight, ChevronLeft, ChevronRight, Headphones, RotateCcw, Shield, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HERO_SLIDES } from "@/components/home/hero-slides";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/checkout/pricing";
import { formatPrice } from "@/lib/format";

const FEATURES = [
  { icon: Truck, title: "Free Delivery", text: `On orders over ${formatPrice(FREE_SHIPPING_THRESHOLD)}` },
  { icon: Shield, title: "Secure Payment", text: "100% protected" },
  { icon: RotateCcw, title: "Easy Returns", text: "30-day policy" },
  { icon: Headphones, title: "24/7 Support", text: "Always here" },
];

/**
 * Client component: autoplay interval + touch-swipe state can't run on the
 * server. The first slide's image still gets `priority` since it's the
 * page's LCP element even though the carousel itself hydrates client-side.
 */
export function HeroBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const goTo = (index: number) => setCurrentSlide(index);
  const next = () => setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  const prev = () => setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);

  const handleTouchEnd = () => {
    const delta = touchStartX.current - touchEndX.current;
    if (delta > 50) next();
    if (delta < -50) prev();
  };

  return (
    <section className="w-full bg-neutral-50 py-3 lg:py-6">
      <div className="mx-auto max-w-7xl px-3 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-white shadow-lg">
          <div
            className="relative min-h-[200px] md:min-h-[300px] lg:min-h-[400px]"
            onTouchStart={(e) => (touchStartX.current = e.targetTouches[0]!.clientX)}
            onTouchMove={(e) => (touchEndX.current = e.targetTouches[0]!.clientX)}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {HERO_SLIDES.map((slide, index) => (
                <Link key={slide.id} href={slide.href} className="relative min-w-full">
                  <div className="relative min-h-[200px] bg-gradient-to-r from-emerald-500 to-teal-600 md:min-h-[300px] lg:min-h-[400px]">
                    <Image
                      src={slide.image}
                      alt={slide.title}
                      fill
                      sizes="100vw"
                      priority={index === 0}
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
                    <div className="relative z-10 flex min-h-[200px] items-center px-4 md:min-h-[300px] md:px-12 lg:min-h-[400px] lg:px-16">
                      <div className="max-w-xl text-white">
                        <span className="mb-2 inline-block rounded-full bg-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm md:mb-3 md:text-xs">
                          Fresh & Organic
                        </span>
                        <h1 className="mb-2 text-2xl font-bold leading-tight md:mb-3 md:text-4xl lg:text-5xl">
                          {slide.title}
                        </h1>
                        <p className="mb-4 text-xs text-white/90 md:mb-6 md:text-base">{slide.subtitle}</p>
                        <div className="flex items-center gap-2 md:gap-3">
                          <span className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-emerald-600 transition-shadow hover:shadow-lg md:px-6 md:py-3 md:text-sm">
                            {slide.cta}
                            <ArrowRight size={16} />
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/10 md:px-6 md:py-3 md:text-sm">
                            Learn More
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <button
              onClick={prev}
              className="absolute left-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-white/90 p-1.5 text-gray-800 shadow-lg backdrop-blur-sm transition-all hover:scale-105 hover:bg-white md:block md:p-2"
              aria-label="Previous slide"
            >
              <ChevronLeft size={20} className="md:h-6 md:w-6" />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-white/90 p-1.5 text-gray-800 shadow-lg backdrop-blur-sm transition-all hover:scale-105 hover:bg-white md:block md:p-2"
              aria-label="Next slide"
            >
              <ChevronRight size={20} className="md:h-6 md:w-6" />
            </button>

            <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
              {HERO_SLIDES.map((slide, index) => (
                <button
                  key={slide.id}
                  onClick={() => goTo(index)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    currentSlide === index ? "w-6 bg-white md:w-8" : "w-1.5 bg-white/50 hover:bg-white/70"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Trust bar — one hairline-divided panel on mobile (the gap-px lets the
            neutral backing show through as dividers), 4-across from `sm` up. */}
        <div className="mt-3 overflow-hidden rounded-2xl border border-neutral-200/70 bg-neutral-200/70 shadow-sm lg:mt-6">
          <div className="grid grid-cols-2 gap-px sm:grid-cols-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="flex items-center gap-3 bg-white px-3.5 py-3 sm:flex-col sm:gap-2 sm:px-3 sm:py-4 sm:text-center"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 sm:h-11 sm:w-11">
                  <feature.icon size={18} className="sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold leading-tight text-neutral-900 sm:text-sm">
                    {feature.title}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-tight text-neutral-500 sm:text-xs">
                    {feature.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
