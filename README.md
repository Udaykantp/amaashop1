# AmaaShop — Next.js 15 (App Router)

Enterprise migration of the AmaaShop React/Vite storefront to Next.js 15,
built server-first with ISR/SSR, Server Actions, and structured data for SEO.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in your Supabase project URL + anon key
npm run dev
```

## Stack

- **Next.js 15** (App Router, React 19)
- **TypeScript**, strict mode
- **Tailwind CSS 3.4** — design tokens ported 1:1 from the original app
- **Supabase** — `@supabase/ssr` for cookie-aware auth, a plain anon client
  for cached public catalog reads (see `src/lib/supabase/`)
- **Zod** — Server Action input validation

## Architecture notes

- `src/app/(storefront)` is a route group carrying the customer-facing chrome
  (Header/Footer/MobileBottomNav). `src/app/admin` sits outside it with its
  own minimal, `noindex` layout — dashboards shouldn't ship storefront nav.
- Cart/wishlist are guest-friendly and client-persisted (`localStorage`) —
  there's no `carts` table in the current schema. Every mutation still runs
  through a Server Action (`src/actions/cart.ts`) that re-fetches the
  authoritative product from Supabase, so price/stock are never trusted from
  the client.
- Data reads for the catalog go through `src/lib/data/*`, each wrapped in
  `unstable_cache` with a `revalidate` window — this is what makes PLP/PDP
  pages ISR instead of hitting Supabase on every request.

See the root conversation for the full folder tree and the list of routes
still to be migrated from `project/src/screens`.
