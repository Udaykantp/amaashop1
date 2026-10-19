/**
 * AmaaShop demo catalog — 16 e-commerce categories + ~35 ACTIVE products,
 * every product branded "AmaaShop" (the founder's herbal / wellness FMCG line:
 * tea, handmade soap, scent, detergent, dishwash, hand wash, phenyl, toilet
 * cleaner, ayurvedic soap, de-tan soap, agarbatti … plus a supporting range).
 *
 * Images are generated as clean, on-brand SVG "labels" (data URIs) — relevant
 * to the product, consistent, and carrying the AmaaShop wordmark. No stock
 * photos, no external hosts. Swap real photography in later from /admin/catalog.
 *
 * Idempotent: `npm run catalog:seed`. Upserts categories; creates products by
 * slug; refreshes existing ones to ACTIVE; clears the old picsum demo rows.
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, Timestamp, type Firestore } from "firebase-admin/firestore";

function initAdmin(): Firestore {
  if (!getApps().length) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || "amaashop-dev";
    if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      initializeApp({ projectId });
    } else {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
      if (!raw) throw new Error("Set FIRESTORE_EMULATOR_HOST or FIREBASE_SERVICE_ACCOUNT_JSON in .env.local.");
      const svc = JSON.parse(raw) as { project_id: string; client_email: string; private_key: string };
      initializeApp({
        credential: cert({ projectId: svc.project_id, clientEmail: svc.client_email, privateKey: svc.private_key.replace(/\\n/g, "\n") }),
        projectId: svc.project_id,
      });
    }
  }
  return getFirestore();
}

const db = initAdmin();

// ── categories ────────────────────────────────────────────────────────────

const CATEGORIES: { slug: string; name: string; iconKey: string; sortOrder: number }[] = [
  { slug: "personal-care", name: "Personal Care", iconKey: "sparkles", sortOrder: 1 },
  { slug: "home-care", name: "Home Care", iconKey: "spray-can", sortOrder: 2 },
  { slug: "tea-coffee", name: "Tea & Coffee", iconKey: "coffee", sortOrder: 3 },
  { slug: "health-wellness", name: "Health & Wellness", iconKey: "heart-pulse", sortOrder: 4 },
  { slug: "devotional", name: "Pooja & Devotional", iconKey: "flame", sortOrder: 5 },
  { slug: "masala-oils", name: "Masala & Oils", iconKey: "bean", sortOrder: 6 },
  { slug: "beverages", name: "Beverages", iconKey: "cup-soda", sortOrder: 7 },
  { slug: "snacks-namkeen", name: "Snacks & Namkeen", iconKey: "popcorn", sortOrder: 8 },
  { slug: "biscuits-cookies", name: "Biscuits & Cookies", iconKey: "cookie", sortOrder: 9 },
  { slug: "sweets-chocolates", name: "Sweets & Chocolates", iconKey: "candy", sortOrder: 10 },
  { slug: "staples-grains", name: "Staples & Grains", iconKey: "wheat", sortOrder: 11 },
  { slug: "dairy-eggs", name: "Dairy & Eggs", iconKey: "egg", sortOrder: 12 },
  { slug: "bakery-breads", name: "Bakery & Breads", iconKey: "croissant", sortOrder: 13 },
  { slug: "fruits-vegetables", name: "Fruits & Dry Fruits", iconKey: "salad", sortOrder: 14 },
  { slug: "frozen-instant", name: "Instant & Ready Mix", iconKey: "snowflake", sortOrder: 15 },
  { slug: "baby-care", name: "Baby Care", iconKey: "baby", sortOrder: 16 },
];

// ── on-brand SVG label generator ──────────────────────────────────────────

const GLYPHS: Record<string, string> = {
  soap: '<rect x="14" y="36" width="72" height="40" rx="14"/><circle cx="74" cy="26" r="7"/>',
  cup: '<path d="M24 36h40v22a20 20 0 0 1-40 0z"/><path d="M64 40a12 12 0 0 1 0 18"/><path d="M36 24q5-10 12-5"/><path d="M50 22q5-10 12-5"/>',
  incense: '<path d="M40 24l-3 60"/><path d="M50 18v66"/><path d="M60 24l3 60"/><path d="M50 18q10-10 3-16"/>',
  box: '<rect x="22" y="32" width="56" height="50" rx="5"/><path d="M22 46h56"/><path d="M46 32v14"/>',
  bottle: '<rect x="40" y="16" width="20" height="12" rx="2"/><rect x="32" y="28" width="36" height="58" rx="10"/><path d="M36 50h28"/>',
  leaf: '<path d="M50 16C78 30 78 66 50 86 22 66 22 30 50 16Z"/><path d="M50 22v58"/>',
};

function palette(cat: string) {
  if (cat === "tea-coffee" || cat === "beverages")
    return { a: "#f4efe3", b: "#e7d9bd", accent: "#8a5a2b", ink: "#43301a", glyph: "cup" };
  if (cat === "home-care")
    return { a: "#eef3f7", b: "#d9e7f0", accent: "#2f6f9e", ink: "#1f3c52", glyph: "bottle" };
  if (cat === "devotional")
    return { a: "#fbf1e1", b: "#f4e0c2", accent: "#c9772a", ink: "#6a3f16", glyph: "incense" };
  if (["health-wellness", "masala-oils", "staples-grains", "fruits-vegetables"].includes(cat))
    return { a: "#e9f1ec", b: "#d3e4da", accent: "#1f5c3d", ink: "#123726", glyph: "leaf" };
  return { a: "#eff3ef", b: "#dfeae2", accent: "#2f6d4f", ink: "#1f3d30", glyph: "soap" };
}

function glyphFor(name: string, fallback: string): string {
  const n = name.toLowerCase();
  if (n.includes("soap")) return "soap";
  if (n.includes("tea") || n.includes("coffee")) return "cup";
  if (/(agarbatti|dhoop|incense|camphor)/.test(n)) return "incense";
  if (/(powder|detergent|atta|malt mix|garam masala|chyawanprash)/.test(n)) return "box";
  if (/(wash|phenyl|cleaner|gel|scent|attar|oil|shampoo|lotion|spray|honey|ghee|juice)/.test(n))
    return "bottle";
  return fallback;
}

function wrapTitle(text: string): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > 16 && cur) {
      lines.push(cur.trim());
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

// ── real product photography (verified Unsplash IDs) ─────────────────────

const PHOTO: Record<string, string> = {
  "green-tea": "photo-1556881286-fc6915169721",
  "black-tea": "photo-1564890369478-c89ca6d9cde9",
  "coffee-powder": "photo-1610889556528-9a770e32642f",
  "soap-bar": "photo-1600857544200-b2f666a9a2ec",
  "clay-soap": "photo-1556228578-8c89e6adf883",
  perfume: "photo-1592945403244-b3fbafd7f539",
  handwash: "photo-1584744982491-665216d95f8b",
  facewash: "photo-1556228720-195a672e8a03",
  shampoo: "photo-1612462766564-895ea3388d2b",
  detergent: "photo-1610557892470-55d9e80c0bce",
  dishwash: "photo-1615486511484-92e172cc4fe0",
  cleaner: "photo-1563453392212-326f5e854473",
  incense: "photo-1600431521340-491eca880813",
  honey: "photo-1587049352846-4a222e784d38",
  "cooking-oil": "photo-1474979266404-7eaacbcd87c5",
  spices: "photo-1596040033229-a9821ebd058d",
  "indian-sweets": "photo-1610508500445-a4592435e27e",
  nuts: "photo-1508747703725-719777637510",
  namkeen: "photo-1601050690597-df0568f70950",
  cookies: "photo-1499636136210-6f4ee915583e",
  flour: "photo-1627485937980-221c88ac04f9",
  ghee: "photo-1631206753348-db44968fd440",
  rusk: "photo-1568051243851-f9b136146e97",
  "dry-fruits": "photo-1508061253366-f7da158b6d46",
  malt: "photo-1517093157656-b9eccef91cb1",
  "baby-lotion": "photo-1522337660859-02fbefca4702",
  juice: "photo-1600271886742-f049cd451bba",
};

function photoSlot(name: string): string | null {
  const n = name.toLowerCase();
  if (/green tea/.test(n)) return "green-tea";
  if (/ctc tea|assam/.test(n)) return "black-tea";
  if (/coffee/.test(n)) return "coffee-powder";
  if (/multani|de-tan|de tan/.test(n)) return "clay-soap";
  if (/soap/.test(n)) return "soap-bar";
  if (/attar|scent|perfume|fragrance/.test(n)) return "perfume";
  if (/hand ?wash/.test(n)) return "handwash";
  if (/face ?wash/.test(n)) return "facewash";
  if (/shampoo/.test(n)) return "shampoo";
  if (/detergent/.test(n)) return "detergent";
  if (/dishwash/.test(n)) return "dishwash";
  if (/phenyl|toilet cleaner|surface cleaner|mosquito|repellent/.test(n)) return "cleaner";
  if (/agarbatti|dhoop|incense|camphor/.test(n)) return "incense";
  if (/honey|chyawanprash/.test(n)) return "honey";
  if (/ oil\b|oil$/.test(n)) return "cooking-oil";
  if (/masala|spice/.test(n)) return "spices";
  if (/kaju|katli|barfi|laddu|sweet/.test(n)) return "indian-sweets";
  if (/makhana|fox nut/.test(n)) return "nuts";
  if (/bhujia|namkeen|sev|mixture/.test(n)) return "namkeen";
  if (/cookie|biscuit/.test(n)) return "cookies";
  if (/atta|flour/.test(n)) return "flour";
  if (/ghee/.test(n)) return "ghee";
  if (/rusk|toast/.test(n)) return "rusk";
  if (/trail mix|\bfig\b|apricot|dry fruit/.test(n)) return "dry-fruits";
  if (/malt|ragi/.test(n)) return "malt";
  if (/lotion|baby/.test(n)) return "baby-lotion";
  if (/juice/.test(n)) return "juice";
  return null;
}

// Brand-supplied product photography — an exact final URL that wins over the
// generic Unsplash slot / on-brand label fallback. Keyed by product name.
const IMAGE_OVERRIDE: Record<string, string> = {
  "AmaaShop A2 Cow Ghee": "https://ik.imagekit.io/kxh5yidni/Amaashop/Amaashop-ghee.png",
  "AmaaShop Herbal Anti-Hairfall Shampoo":
    "https://ik.imagekit.io/kxh5yidni/Amaashop/Amaashop-shampoo.png",
  "AmaaShop Raw Forest Honey": "https://ik.imagekit.io/kxh5yidni/Amaashop/Amaashop-honey.png",
  "AmaaShop Kaju Katli": "https://ik.imagekit.io/kxh5yidni/Amaashop/Amaashop-kaju-katli.png",
  "AmaaShop Wood-Pressed Groundnut Oil":
    "https://ik.imagekit.io/kxh5yidni/Amaashop/Amaashop-groundnut-oil.png",
  "AmaaShop Multigrain Cookies": "https://ik.imagekit.io/kxh5yidni/Amaashop/Amaashop-cookies.png",
};

/**
 * Every product gets one default variant — its own pack — so the competitor
 * price-comparison feature (keyed by `ProductVariant.sku`) has something to
 * query. SKU is the product SKU + "-STD".
 */
async function upsertDefaultVariant(
  productId: string,
  productSku: string,
  grams: number,
  unit: string,
  mrp: number,
  price: number,
): Promise<void> {
  const sku = `${productSku}-STD`;
  const now = Timestamp.now();
  const existing = await db.collection("product_variants").doc(sku).get();
  await db
    .collection("product_variants")
    .doc(sku)
    .set(
      {
        productId,
        sku,
        weightGrams: grams,
        label: unit,
        mrp: mrp.toFixed(2),
        sellingPrice: price.toFixed(2),
        isActive: true,
        createdAt: existing.exists ? existing.get("createdAt") : now,
        updatedAt: now,
      },
      { merge: true },
    );
}

function imageFor(name: string, unit: string, cat: string): string {
  const override = IMAGE_OVERRIDE[name];
  if (override) return override;

  const s = photoSlot(name);
  if (s && PHOTO[s]) {
    return `https://images.unsplash.com/${PHOTO[s]}?auto=format&fit=crop&w=900&q=75`;
  }
  return brandImage(name, unit, cat); // last-resort on-brand label
}

function brandImage(name: string, unit: string, cat: string): string {
  const p = palette(cat);
  const g = GLYPHS[glyphFor(name, p.glyph)]!;
  const title = wrapTitle(name.replace(/^AmaaShop\s+/i, ""));
  const startY = title.length === 1 ? 452 : title.length === 2 ? 420 : 392;
  const titleTspans = title
    .map((l, i) => `<tspan x="72" dy="${i === 0 ? 0 : 66}">${l}</tspan>`)
    .join("");
  const ruleY = startY + (title.length - 1) * 66 + 40;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${p.a}"/><stop offset="1" stop-color="${p.b}"/></linearGradient></defs>` +
    `<rect width="800" height="800" fill="url(#g)"/>` +
    `<rect width="800" height="12" fill="${p.accent}"/>` +
    `<g transform="translate(400 315) scale(4.6) translate(-50 -50)" fill="none" stroke="${p.accent}" ` +
    `stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.13">${g}</g>` +
    `<text x="72" y="104" font-family="Georgia,'Times New Roman',serif" font-size="27" letter-spacing="7" ` +
    `font-weight="700" fill="${p.accent}">AMAASHOP</text>` +
    `<text x="72" y="${startY}" font-family="Georgia,'Times New Roman',serif" font-size="54" ` +
    `font-weight="700" fill="${p.ink}">${titleTspans}</text>` +
    `<line x1="72" y1="${ruleY}" x2="248" y2="${ruleY}" stroke="${p.accent}" stroke-width="4"/>` +
    `<text x="72" y="${ruleY + 44}" font-family="Helvetica,Arial,sans-serif" font-size="25" ` +
    `fill="${p.ink}" opacity="0.72">${unit}</text>` +
    `<text x="72" y="740" font-family="Helvetica,Arial,sans-serif" font-size="20" letter-spacing="4" ` +
    `fill="${p.ink}" opacity="0.5">HERBAL &#183; HANDMADE &#183; HONEST</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// ── products (all brand = AmaaShop) ───────────────────────────────────────
// [name, categorySlug, mrp, price, gstBps, unit, grams, pv, bv, blurb, keyword, flags(P/L/F)]

type Row = [
  string, string, number, number, number, string, number, number, number, string, string, string,
];

const PRODUCTS: Row[] = [
  // ── founder line ──────────────────────────────────────────────────────
  ["AmaaShop Herbal Green Tea", "tea-coffee", 260, 199, 500, "100 g", 120, 8, 6,
    "Whole-leaf green tea blended with tulsi and lemongrass for a clean, everyday cup.", "herbal green tea", "PLF"],
  ["AmaaShop Handmade Neem & Turmeric Soap", "personal-care", 95, 75, 1800, "100 g", 110, 4, 3,
    "Cold-process soap hand-cut in small batches, with neem, turmeric and cold-pressed coconut oil.", "handmade neem soap", "PL"],
  ["AmaaShop Herbal Roll-On Attar", "personal-care", 190, 149, 1800, "8 ml", 40, 7, 5,
    "An alcohol-free roll-on attar — warm sandal and jasmine notes that last through the day.", "herbal attar roll on", "F"],
  ["AmaaShop Active Detergent Powder", "home-care", 230, 185, 1800, "1 kg", 1050, 8, 6,
    "A high-foam detergent with plant-derived enzymes that lifts tough stains in cold water.", "herbal detergent powder", "PL"],
  ["AmaaShop Lemon Dishwash Gel", "home-care", 135, 109, 1800, "500 ml", 550, 5, 4,
    "Thick lemon gel that cuts grease fast and rinses clean, gentle on hands.", "lemon dishwash gel", "L"],
  ["AmaaShop Herbal Hand Wash", "personal-care", 125, 99, 1800, "250 ml", 290, 5, 4,
    "A mild aloe-and-neem hand wash that cleans without drying, with a light herbal scent.", "herbal hand wash", "PF"],
  ["AmaaShop White Phenyl Floor Disinfectant", "home-care", 160, 125, 1800, "1 L", 1050, 6, 5,
    "Concentrated white phenyl — a capful per bucket disinfects and leaves a fresh pine finish.", "white phenyl floor cleaner", ""],
  ["AmaaShop Herbal Toilet Cleaner", "home-care", 115, 92, 1800, "500 ml", 560, 5, 4,
    "A thick acidic gel that clings to the bowl, removes hard-water stains and kills 99.9% of germs.", "herbal toilet cleaner", "F"],
  ["AmaaShop Ayurvedic Bath Soap", "personal-care", 90, 72, 1800, "100 g", 110, 4, 3,
    "A classic ayurvedic bathing bar with 9 herbs, for clear, comfortable skin.", "ayurvedic bath soap", "PL"],
  ["AmaaShop De-Tan Multani Mitti Soap", "personal-care", 99, 82, 1800, "100 g", 110, 4, 3,
    "Multani mitti and orange-peel soap that gently lifts tan and mattifies oily skin.", "de tan multani soap", "F"],
  ["AmaaShop Sandal Dhoop Agarbatti", "devotional", 130, 99, 500, "90 sticks", 260, 5, 4,
    "Hand-rolled agarbatti on bamboo, charcoal-free, with a slow, even sandalwood burn.", "sandal agarbatti dhoop", "PF"],

  // ── supporting range (all AmaaShop) ──────────────────────────────────
  ["AmaaShop Assam CTC Tea", "tea-coffee", 340, 279, 500, "500 g", 520, 12, 9,
    "Strong, brisk second-flush Assam CTC that brews a proper kadak cup.", "assam ctc tea", "L"],
  ["AmaaShop Filter Coffee Blend", "tea-coffee", 270, 229, 500, "250 g", 270, 10, 8,
    "An 80:20 coffee-and-chicory blend, roasted medium-dark and freshly ground.", "filter coffee blend", "F"],
  ["AmaaShop Green Tea Bags", "beverages", 180, 149, 500, "25 bags", 60, 6, 4,
    "Individually foil-wrapped pyramid bags of whole-leaf green tea for the office desk.", "green tea bags", ""],
  ["AmaaShop No-Sugar Mixed Fruit Juice", "beverages", 155, 129, 1200, "1 L", 1050, 5, 4,
    "Cold-filled juice pressed from six fruits, with no added sugar, water or colour.", "no sugar fruit juice", "F"],
  ["AmaaShop Raw Forest Honey", "health-wellness", 420, 349, 500, "500 g", 550, 15, 12,
    "Unheated, unfiltered multi-floral honey gathered from the Nilgiri forest belt.", "raw forest honey", "PLF"],
  ["AmaaShop Ayurvedic Chyawanprash", "health-wellness", 340, 279, 1200, "500 g", 540, 12, 9,
    "A 40-herb amla base, slow-cooked in an iron kadhai with jaggery, never refined sugar.", "ayurvedic chyawanprash", "F"],
  ["AmaaShop Aloe & Neem Face Wash", "personal-care", 199, 159, 1800, "100 ml", 130, 8, 6,
    "A soap-free gel cleanser with cold-pressed aloe and neem, balanced to skin pH.", "aloe neem face wash", "L"],
  ["AmaaShop Herbal Anti-Hairfall Shampoo", "personal-care", 210, 175, 1800, "200 ml", 240, 8, 6,
    "A sulphate-free shampoo with bhringraj and amla that cleans gently and reduces breakage.", "herbal anti hairfall shampoo", "P"],
  ["AmaaShop Cold-Pressed Coconut Oil", "masala-oils", 520, 429, 500, "1 L", 950, 40, 32,
    "Kerala coconut oil pressed cold and left unrefined, with a natural nutty aroma.", "cold pressed coconut oil", "F"],
  ["AmaaShop Wood-Pressed Groundnut Oil", "masala-oils", 649, 499, 500, "1 L", 1050, 45, 35,
    "Groundnuts crushed slowly in a wooden ghani under 40 C — unrefined and full of aroma.", "wood pressed groundnut oil", "PLF"],
  ["AmaaShop Stone-Ground Garam Masala", "masala-oils", 150, 125, 500, "100 g", 110, 6, 4,
    "A 16-spice blend, roasted in small batches and stone-ground the same day.", "stone ground garam masala", ""],
  ["AmaaShop Multi-Surface Cleaner", "home-care", 165, 135, 1800, "1 L", 1050, 6, 5,
    "One cleaner for floors, glass, tiles and kitchen counters — streak-free, mild fragrance.", "multi surface cleaner", "L"],
  ["AmaaShop Herbal Mosquito Repellent Spray", "home-care", 145, 119, 1800, "100 ml", 130, 5, 4,
    "A citronella and eucalyptus spray that keeps mosquitoes off for hours, DEET-free.", "herbal mosquito repellent spray", ""],
  ["AmaaShop Kaju Katli", "sweets-chocolates", 340, 299, 500, "250 g", 270, 12, 9,
    "Pure cashew fudge rolled wafer-thin under edible silver leaf — no glucose, no filler.", "kaju katli", "P"],
  ["AmaaShop Peri-Peri Roasted Makhana", "snacks-namkeen", 175, 149, 1200, "90 g", 110, 6, 4,
    "Fox nuts roasted, not fried, then tossed in a bright peri-peri seasoning.", "roasted makhana peri peri", "L"],
  ["AmaaShop Aloo Bhujia", "snacks-namkeen", 115, 95, 1200, "400 g", 420, 4, 3,
    "Crunchy potato-and-gram-flour bhujia, fried in groundnut oil and lightly spiced.", "aloo bhujia", ""],
  ["AmaaShop Multigrain Cookies", "biscuits-cookies", 110, 89, 1800, "200 g", 220, 4, 3,
    "Wholegrain cookies with oats, ragi and jaggery — no maida, no palm oil.", "multigrain cookies", "P"],
  ["AmaaShop Chakki Multigrain Atta", "staples-grains", 320, 279, 0, "5 kg", 5000, 14, 11,
    "Stone-milled wheat with soya, oats and flax for softer rotis that stay fresh longer.", "multigrain chakki atta", ""],
  ["AmaaShop A2 Cow Ghee", "dairy-eggs", 690, 579, 1200, "500 ml", 560, 22, 18,
    "Bilona-method A2 ghee, hand-churned from cultured curd — grainy, aromatic, golden.", "a2 cow ghee bilona", "P"],
  ["AmaaShop Millet Rusk", "bakery-breads", 130, 109, 1800, "200 g", 220, 4, 3,
    "Twice-baked millet rusk, light and crisp, made for chai without turning soggy fast.", "millet rusk", ""],
  ["AmaaShop Fig & Apricot Trail Mix", "fruits-vegetables", 380, 329, 1200, "250 g", 270, 12, 9,
    "Turkish figs and apricots with almonds and pumpkin seeds — no added sugar or oil.", "fig apricot trail mix", "L"],
  ["AmaaShop Instant Ragi Malt Mix", "frozen-instant", 195, 159, 1200, "500 g", 520, 7, 5,
    "A malted ragi drink mix with cardamom and jaggery — just add hot milk or water.", "instant ragi malt mix", ""],
  ["AmaaShop Gentle Baby Lotion", "baby-care", 260, 209, 1800, "200 ml", 240, 9, 7,
    "A light, fast-absorbing lotion with shea and oat, fragrance-minimal and dermatologically tested.", "gentle baby lotion", "L"],
  ["AmaaShop Camphor Tablets for Pooja", "devotional", 95, 79, 1200, "100 g", 110, 4, 3,
    "Pure refined camphor tablets that light cleanly for aarti, with minimal residue.", "pooja camphor tablets", ""],
];

function slugify(s: string) {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function gtin(i: number) {
  return "890" + String(2000000 + i * 41).padStart(10, "0");
}
function description(name: string, cat: string, unit: string, blurb: string) {
  const c = CATEGORIES.find((x) => x.slug === cat)?.name ?? "everyday range";
  return (
    `${blurb} ${name} is part of the AmaaShop ${c.toLowerCase()} line — made in small ` +
    `batches, quality-checked before dispatch, and priced fairly with no middleman markup. ` +
    `It ships in tamper-evident packaging through a clean supply chain, so what reaches your ` +
    `door is exactly what you ordered. Pack size ${unit}. Unopened items are returnable within ` +
    `7 days, and most locations are served in 2–4 days.`
  );
}

async function main() {
  // Categories and products are keyed by their own slug in this seed script —
  // a simple, stable natural key for fresh dev data. (Real migrated
  // production catalog rows keep their original Postgres cuid as their
  // Firestore doc id instead — see scripts/migrate-to-firestore/.)
  const catId: Record<string, string> = {};
  for (const c of CATEGORIES) {
    await db.collection("categories").doc(c.slug).set({ name: c.name, slug: c.slug, iconKey: c.iconKey, sortOrder: c.sortOrder });
    catId[c.slug] = c.slug;
  }
  console.log(`categories: ${CATEGORIES.length} upserted`);

  // drop the earlier picsum demo products (dev/seed data only — this script
  // never runs against a real migrated production catalog, so no "still
  // referenced by a real order" guard is needed here).
  const allProductsSnap = await db.collection("products").get();
  let removedCount = 0;
  for (const d of allProductsSnap.docs) {
    const imageUrl = d.get("imageUrl") as string | null;
    if (!imageUrl?.includes("picsum.photos")) continue;
    await d.ref.delete();
    removedCount++;
  }
  if (removedCount) console.log(`removed ${removedCount} old demo products`);

  // drop empty legacy categories no longer in the set
  const keep = new Set(CATEGORIES.map((c) => c.slug));
  const allCategoriesSnap = await db.collection("categories").get();
  for (const d of allCategoriesSnap.docs) {
    if (keep.has(d.id)) continue;
    const inUse = await db.collection("products").where("categoryId", "==", d.id).limit(1).get();
    if (inUse.empty) {
      await d.ref.delete();
      console.log(`removed empty legacy category: ${d.get("name")}`);
    }
  }

  let created = 0;
  let refreshed = 0;
  for (let i = 0; i < PRODUCTS.length; i++) {
    const [name, cat, mrp, price, gstBps, unit, grams, pv, bv, blurb, kw, flags] = PRODUCTS[i]!;
    const slug = slugify(name);
    const productSku = slug.toUpperCase().replace(/-/g, "_").slice(0, 40);
    const categoryId = catId[cat]!;
    const productRef = db.collection("products").doc(slug);
    const existing = await productRef.get();
    const img = imageFor(name, unit, cat);

    if (existing.exists) {
      await productRef.update({
        categoryId,
        brand: "AmaaShop",
        status: "ACTIVE",
        isActive: true,
        imageUrl: img,
        images: [img],
        updatedAt: FieldValue.serverTimestamp(),
      });
      const imagesCol = productRef.collection("images");
      const oldImages = await imagesCol.get();
      await Promise.all(oldImages.docs.map((d) => d.ref.delete()));
      await imagesCol.add({ url: img, alt: `${name} — ${unit}`, position: 0, createdAt: FieldValue.serverTimestamp() });
      await upsertDefaultVariant(slug, productSku, grams, unit, mrp, price);
      refreshed++;
      continue;
    }

    const rating = Math.round((4.0 + ((i * 7) % 9) / 10) * 10) / 10;
    const reviews = 18 + ((i * 47) % 380);
    const now = FieldValue.serverTimestamp();

    await productRef.set({
      sku: productSku,
      name,
      slug,
      subtitle: blurb.length > 92 ? blurb.slice(0, 90) + "…" : blurb,
      description: description(name, cat, unit, blurb),
      brand: "AmaaShop",
      categoryId,
      tags: ["amaashop", cat.replace(/-/g, " "), unit.toLowerCase()],
      status: "ACTIVE",
      publishedAt: now,
      isActive: true,
      isFeatured: flags.includes("F"),
      isPopular: flags.includes("P"),
      isLatest: flags.includes("L"),
      mrp: mrp.toFixed(2),
      sellingPrice: price.toFixed(2),
      gstRateBps: gstBps,
      hsnCode: gstBps === 0 ? "1101" : gstBps === 500 ? "0902" : gstBps === 1200 ? "2106" : "3401",
      gtin: gtin(i),
      unitLabel: unit,
      weightGrams: grams,
      pv: pv.toFixed(2),
      bv: bv.toFixed(2),
      autoshipEligible: pv >= 6,
      imageUrl: img,
      images: [img],
      metaTitle: `${name} — ${unit} | AmaaShop`.slice(0, 70),
      metaDescription: `${blurb} Genuine AmaaShop product — fast delivery, easy 7-day returns.`.slice(0, 160),
      canonicalUrl: null,
      ogImageUrl: null,
      noIndex: false,
      focusKeyword: kw,
      rating: rating.toFixed(2),
      reviews,
      createdAt: now,
      updatedAt: now,
      createdByUserId: null,
      updatedByUserId: null,
    });
    await productRef.collection("images").add({ url: img, alt: `${name} — ${unit}`, position: 0, createdAt: FieldValue.serverTimestamp() });
    await upsertDefaultVariant(slug, productSku, grams, unit, mrp, price);
    created++;
  }

  const totalSnap = await db.collection("products").where("status", "==", "ACTIVE").count().get();
  console.log(`products: ${created} created, ${refreshed} refreshed`);
  console.log(`ACTIVE products in catalog: ${totalSnap.data().count}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
