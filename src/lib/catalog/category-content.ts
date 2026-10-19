/**
 * Per-category storefront copy for the clean `/category/[slug]` routes.
 * Crawlable intro text is one of the strongest on-page signals for a
 * collection page — keep it specific, honest, and keyword-natural.
 *
 * Isomorphic + dependency-free (no `server-only`): the category page renders
 * it server-side, but it's safe to import anywhere.
 */

export interface CategoryContent {
  /** ~140–160 char meta description. */
  metaDescription: string;
  /** 1–3 sentence on-page intro shown under the H1. */
  intro: string;
}

const GENERIC = (name: string): CategoryContent => ({
  metaDescription: `Shop ${name} from AmaaShop — genuine products at honest prices, delivered across India with easy 7-day returns.`,
  intro: `Browse ${name} from AmaaShop. Every product is genuine, fairly priced, and shipped fresh across India, with easy 7-day returns if it isn't right for you.`,
});

const CONTENT: Record<string, CategoryContent> = {
  "personal-care": {
    metaDescription:
      "Herbal & Ayurvedic personal care from AmaaShop — handmade soaps, face wash, attar and daily skincare, made with natural ingredients. Delivered across India.",
    intro:
      "AmaaShop personal care is built around simple, natural formulations — handmade neem and turmeric soap, aloe and neem face wash, herbal roll-on attar and everyday skincare. No harsh chemicals, no inflated MRPs, just honest products for daily use.",
  },
  "home-care": {
    metaDescription:
      "Natural home care from AmaaShop — detergent powder, dishwash, hand wash, floor phenyl and toilet cleaner that clean well without the harsh chemical load.",
    intro:
      "Keep your home clean the gentler way. AmaaShop home care covers active detergent powder, dishwash gel, hand wash, floor phenyl and toilet cleaner — effective on grime and grease, kinder on your hands and your home.",
  },
  "tea-coffee": {
    metaDescription:
      "AmaaShop tea & coffee — Assam CTC, herbal green tea and more, sourced for a full-bodied everyday cup. Fresh packs delivered across India.",
    intro:
      "From a strong Assam CTC morning cup to a light herbal green tea, AmaaShop tea and coffee is sourced and packed for freshness. Everyday blends, honestly priced.",
  },
  "health-wellness": {
    metaDescription:
      "AmaaShop health & wellness — Ayurvedic and herbal daily-wellness essentials, chosen for genuine ingredients and clear labelling.",
    intro:
      "Herbal and Ayurvedic wellness picks for daily routines — chosen for genuine ingredients, clear labelling and fair pricing.",
  },
  devotional: {
    metaDescription:
      "Pooja & devotional essentials from AmaaShop — agarbatti, dhoop, camphor and puja samagri for daily worship and festivals. Delivered across India.",
    intro:
      "Everything for daily aarti and festival pujas — natural agarbatti and dhoop, camphor tablets and puja samagri. AmaaShop devotional items are made for a clean, fragrant offering.",
  },
  "masala-oils": {
    metaDescription:
      "AmaaShop masala & cooking oils — everyday spices and pure oils for Indian kitchens, packed for freshness and delivered across India.",
    intro:
      "Kitchen staples that pull their weight — everyday masalas and pure cooking oils, packed for freshness so your food tastes the way it should.",
  },
  beverages: {
    metaDescription:
      "AmaaShop beverages — juices, drink mixes and everyday refreshments, delivered fresh across India at honest prices.",
    intro:
      "Everyday beverages and drink mixes for the household — refreshing, fairly priced and delivered fresh.",
  },
  "snacks-namkeen": {
    metaDescription:
      "AmaaShop snacks & namkeen — aloo bhujia, mixtures and tea-time snacks, packed crisp and delivered across India.",
    intro:
      "Tea-time sorted. AmaaShop snacks and namkeen — aloo bhujia, mixtures and classic Indian nibbles, packed crisp and sealed for freshness.",
  },
  "biscuits-cookies": {
    metaDescription:
      "AmaaShop biscuits & cookies — everyday tea biscuits and bakes, delivered fresh across India.",
    intro:
      "Biscuits and cookies for the daily chai break — familiar favourites, fresh packs, honest prices.",
  },
  "sweets-chocolates": {
    metaDescription:
      "AmaaShop sweets & chocolates — festive mithai and everyday treats, delivered across India.",
    intro:
      "A little something sweet — festive mithai and everyday chocolates, delivered fresh for gifting or for yourself.",
  },
  "staples-grains": {
    metaDescription:
      "AmaaShop staples & grains — atta, rice, dals and pulses for the Indian kitchen, delivered across India.",
    intro:
      "The base of every meal — atta, rice, dals and pulses, cleaned and packed well, delivered to your door.",
  },
  "dairy-eggs": {
    metaDescription:
      "AmaaShop dairy & eggs — A2 cow ghee and daily dairy essentials, delivered fresh across India.",
    intro:
      "Daily dairy done right — including small-batch A2 cow ghee — sourced and handled for freshness.",
  },
  "bakery-breads": {
    metaDescription:
      "AmaaShop bakery & breads — everyday loaves and bakes, delivered fresh across India.",
    intro:
      "Fresh from the bakery shelf — everyday breads and bakes for breakfast and beyond.",
  },
  "fruits-vegetables": {
    metaDescription:
      "AmaaShop fruits & dry fruits — everyday produce and premium dry fruits, delivered fresh across India.",
    intro:
      "Everyday produce and premium dry fruits — picked for quality and delivered fresh.",
  },
  "frozen-instant": {
    metaDescription:
      "AmaaShop instant & ready mixes — quick-cook mixes and ready meals for busy days, delivered across India.",
    intro:
      "For the days there's no time to cook — dependable instant and ready mixes that still taste homemade.",
  },
  "baby-care": {
    metaDescription:
      "AmaaShop baby care — gentle baby lotion and daily essentials, formulated for delicate skin. Delivered across India.",
    intro:
      "Gentle by design — baby lotion and daily-care essentials formulated for delicate skin, with ingredients you can actually read.",
  },
};

export function categoryContent(slug: string, name: string): CategoryContent {
  return CONTENT[slug] ?? GENERIC(name);
}
