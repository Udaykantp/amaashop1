import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { FirebaseAnalytics } from "@/components/firebase-analytics";
import { JsonLd } from "@/components/seo/json-ld";
import { localBusinessSchema, organizationSchema, websiteSchema } from "@/lib/seo/schema";
import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_LOCALE,
  SITE_NAME,
  SITE_OG_LOCALE,
  SITE_TAGLINE,
  SITE_URL,
} from "@/lib/constants";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Warm serif for headings — the "wellness" half of the brand voice.
// Variable font: no `weight` (the full 100–900 axis ships), plus the optical-
// size and softness axes.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "opsz"],
});

const FAVICON = "https://ik.imagekit.io/kxh5yidni/Amaashop/favicon-Amashop.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: SITE_KEYWORDS,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "shopping",
  // NOTE: no `alternates.canonical` here on purpose — canonical is per-page.
  formatDetection: { email: false, address: false, telephone: false },
  icons: {
    icon: FAVICON,
    shortcut: FAVICON,
    apple: FAVICON,
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: SITE_OG_LOCALE,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : undefined,
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // `suppressHydrationWarning` on <html>/<body>: browser extensions (password
  // managers, coupon / shopping add-ons, Grammarly, …) inject attributes like
  // `__processed_<uuid>__` onto these elements before React hydrates. This flag
  // only silences attribute mismatches on the element it's set on — never its
  // subtree — so real mismatches inside the app still surface.
  return (
    <html
      lang={SITE_LOCALE}
      className={`${inter.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://ik.imagekit.io" crossOrigin="" />
        <link rel="dns-prefetch" href="https://ik.imagekit.io" />
        <link rel="preconnect" href="https://storage.googleapis.com" crossOrigin="" />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <JsonLd data={organizationSchema()} />
        <JsonLd data={websiteSchema()} />
        {(() => {
          const store = localBusinessSchema();
          return store ? <JsonLd data={store} /> : null;
        })()}
        <FirebaseAnalytics />
        {children}
      </body>
    </html>
  );
}
