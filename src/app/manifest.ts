import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION_SHORT, SITE_NAME, SITE_TAGLINE } from "@/lib/constants";

const FAVICON = "https://ik.imagekit.io/kxh5yidni/Amaashop/favicon-Amashop.com";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${SITE_NAME} — ${SITE_TAGLINE}`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION_SHORT,
    start_url: "/?utm_source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#059669",
    lang: "en-IN",
    dir: "ltr",
    categories: ["shopping", "lifestyle", "health"],
    icons: [
      { src: `${FAVICON}?tr=w-192,h-192`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${FAVICON}?tr=w-512,h-512`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${FAVICON}?tr=w-512,h-512`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Shop all products", short_name: "Shop", url: "/shop" },
      { name: "Track my order", short_name: "Track", url: "/track-order" },
    ],
  };
}
