import {
  Apple,
  Baby,
  Bean,
  Beef,
  Beer,
  Candy,
  CandyOff,
  Carrot,
  Coffee,
  Cookie,
  CupSoda,
  Croissant,
  Dog,
  Drumstick,
  Egg,
  Fish,
  Flame,
  Grape,
  HeartPulse,
  IceCreamCone,
  Leaf,
  Milk,
  Package,
  Popcorn,
  Salad,
  Sandwich,
  Shirt,
  ShoppingBasket,
  Snowflake,
  Soup,
  Sparkles,
  SprayCan,
  Sprout,
  Wheat,
  Wine,
  type LucideIcon,
} from "lucide-react";

/**
 * Category `iconKey` (stored on `Category.iconKey`, kebab-case) → a real icon.
 * Falls back to a generic basket so a new/unknown category never renders as
 * raw text.
 */
const ICONS: Record<string, LucideIcon> = {
  "cup-soda": CupSoda,
  "spray-can": SprayCan,
  sparkles: Sparkles,
  flame: Flame,
  apple: Apple,
  carrot: Carrot,
  milk: Milk,
  beef: Beef,
  fish: Fish,
  croissant: Croissant,
  cookie: Cookie,
  wheat: Wheat,
  coffee: Coffee,
  "ice-cream": IceCreamCone,
  "candy-off": CandyOff,
  candy: Candy,
  baby: Baby,
  dog: Dog,
  leaf: Leaf,
  package: Package,
  basket: ShoppingBasket,
  salad: Salad,
  egg: Egg,
  bean: Bean,
  popcorn: Popcorn,
  snowflake: Snowflake,
  "heart-pulse": HeartPulse,
  drumstick: Drumstick,
  grape: Grape,
  soup: Soup,
  sandwich: Sandwich,
  beer: Beer,
  wine: Wine,
  sprout: Sprout,
  shirt: Shirt,
};

export function CategoryIcon({
  iconKey,
  className,
  strokeWidth = 1.75,
}: {
  iconKey: string | null;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = (iconKey && ICONS[iconKey]) || ShoppingBasket;
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden />;
}
