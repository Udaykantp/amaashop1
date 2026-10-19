import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  const host = SITE_URL.replace(/^https?:\/\//, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Private / transactional areas — no SEO value, keep out of the index.
          "/admin",
          "/office",
          "/member",
          "/account",
          "/api/",
          "/cart",
          "/checkout",
          "/orders",
          "/wishlist",
          "/signin",
          "/signup",
          "/search",
          // Faceted-navigation noise: let category pages be crawled, but not the
          // near-infinite sort / price / rating / stock / query permutations.
          "/*?*sort=",
          "/*?*minPrice=",
          "/*?*maxPrice=",
          "/*?*minRating=",
          "/*?*inStock=",
          "/*?*q=",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host,
  };
}
