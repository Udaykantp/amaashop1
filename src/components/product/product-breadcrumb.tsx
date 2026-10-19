import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Product } from "@/lib/types";

export function ProductBreadcrumb({ product }: { product: Product }) {
  return (
    <nav className="hidden items-center gap-1 text-sm text-neutral-500 lg:mb-6 lg:flex" aria-label="Breadcrumb">
      <Link href="/" className="hover:text-emerald-600">Home</Link>
      <ChevronRight size={14} />
      <Link href="/shop" className="hover:text-emerald-600">Shop</Link>
      {product.categories && (
        <>
          <ChevronRight size={14} />
          <Link
            href={`/shop?category=${encodeURIComponent(product.categories.name)}`}
            className="hover:text-emerald-600"
          >
            {product.categories.name}
          </Link>
        </>
      )}
      <ChevronRight size={14} />
      <span className="text-neutral-800">{product.name}</span>
    </nav>
  );
}
