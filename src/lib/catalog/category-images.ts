/**
 * Curated, professionally-shot stand-in photo per storefront category —
 * shown on "Shop by category" tiles only until that category has a real,
 * photographed ACTIVE product of its own (see `categoryProductStats` in
 * `src/server/catalog/public.ts`, which always prefers a real catalog photo
 * over this map). Keyed by the exact `Category.name` as stored in Firestore;
 * an unlisted category just falls back to its icon, so this never breaks.
 *
 * Sourced from Pexels (already an allowed `next.config.ts` image host),
 * hand-picked per category and reviewed for no third-party brand logos/text.
 */
export const CATEGORY_STOCK_IMAGES: Record<string, string> = {
  "Personal Care": "https://images.pexels.com/photos/8101520/pexels-photo-8101520.jpeg?auto=compress&cs=tinysrgb&w=800",
  "Home Care": "https://images.pexels.com/photos/4440564/pexels-photo-4440564.jpeg?auto=compress&cs=tinysrgb&w=800",
  "Tea & Coffee": "https://images.pexels.com/photos/12153458/pexels-photo-12153458.jpeg?auto=compress&cs=tinysrgb&w=800",
  "Health & Wellness": "https://images.pexels.com/photos/4174743/pexels-photo-4174743.jpeg?auto=compress&cs=tinysrgb&w=800",
  "Pooja & Devotional": "https://images.pexels.com/photos/34385011/pexels-photo-34385011.jpeg?auto=compress&cs=tinysrgb&w=800",
  "Masala & Oils": "https://images.pexels.com/photos/31280796/pexels-photo-31280796.jpeg?auto=compress&cs=tinysrgb&w=800",
  Beverages: "https://images.pexels.com/photos/29851973/pexels-photo-29851973.jpeg?auto=compress&cs=tinysrgb&w=800",
  "Snacks & Namkeen": "https://images.pexels.com/photos/13060679/pexels-photo-13060679.jpeg?auto=compress&cs=tinysrgb&w=800",
  "Biscuits & Cookies": "https://images.pexels.com/photos/15290322/pexels-photo-15290322.jpeg?auto=compress&cs=tinysrgb&w=800",
  "Sweets & Chocolates": "https://images.pexels.com/photos/8887052/pexels-photo-8887052.jpeg?auto=compress&cs=tinysrgb&w=800",
  "Staples & Grains": "https://images.pexels.com/photos/8287244/pexels-photo-8287244.jpeg?auto=compress&cs=tinysrgb&w=800",
  "Dairy & Eggs": "https://images.pexels.com/photos/11363573/pexels-photo-11363573.jpeg?auto=compress&cs=tinysrgb&w=800",
  "Bakery & Breads": "https://images.pexels.com/photos/3789032/pexels-photo-3789032.jpeg?auto=compress&cs=tinysrgb&w=800",
  "Fruits & Dry Fruits": "https://images.pexels.com/photos/5202097/pexels-photo-5202097.jpeg?auto=compress&cs=tinysrgb&w=800",
  "Instant & Ready Mix": "https://images.pexels.com/photos/39007274/pexels-photo-39007274.jpeg?auto=compress&cs=tinysrgb&w=800",
  "Baby Care": "https://images.pexels.com/photos/11501481/pexels-photo-11501481.jpeg?auto=compress&cs=tinysrgb&w=800",
};
