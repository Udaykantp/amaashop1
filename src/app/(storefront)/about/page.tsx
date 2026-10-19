import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { ValuesGrid } from "@/components/about/values-grid";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "About Us",
  description: `Learn about ${SITE_NAME} — an Indian D2C brand making genuine herbal personal care, natural home care and everyday essentials, delivered at honest prices across India.`,
  alternates: { canonical: "/about" },
};

const STATS = [
  { number: "10K+", label: "Happy Customers" },
  { number: "500+", label: "Products Available" },
  { number: "50+", label: "Local Farmers" },
  { number: "99%", label: "Satisfaction Rate" },
];

export default function AboutPage() {
  return (
    <div>
      <JsonLd data={breadcrumbSchema([{ name: "Home", url: "/" }, { name: "About", url: "/about" }])} />

      <section className="bg-neutral-50 py-16">
        <div className="mx-auto max-w-7xl px-4 text-center lg:px-8">
          <h1 className="text-3xl font-bold text-neutral-800 md:text-4xl">About {SITE_NAME}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-neutral-600">
            We&apos;re on a mission to make fresh, quality groceries accessible to everyone. From farm to table, we
            ensure every product meets the highest standards of freshness and quality.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-neutral-800">Our Story</h2>
            <p className="mt-4 leading-relaxed text-neutral-600">
              Founded in 2024, {SITE_NAME} started as a small neighborhood grocery store with a big dream — to bring
              farm-fresh produce and quality products directly to families&apos; doorsteps. What began as a local
              initiative has grown into a trusted online grocery destination serving thousands of happy customers.
            </p>
            <p className="mt-4 leading-relaxed text-neutral-600">
              We partner directly with local farmers and trusted suppliers to ensure you get the freshest products at
              the best prices, every single day.
            </p>
            <Link href="/shop" className="mt-6 inline-block rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-600">
              Start Shopping
            </Link>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-lg">
            <Image
              src="https://images.pexels.com/photos/9070116/pexels-photo-9070116.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"
              alt="Fresh produce being packed for delivery"
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <ValuesGrid />

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl font-bold text-emerald-600 md:text-4xl">{stat.number}</p>
              <p className="mt-1 text-sm text-neutral-600">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
