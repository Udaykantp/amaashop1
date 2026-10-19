export interface HeroSlide {
  id: number;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  image: string;
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 1,
    title: "Fresh Groceries Delivered Daily",
    subtitle: "Farm-fresh fruits, vegetables, bakery & dairy",
    cta: "Shop Now",
    href: "/shop",
    image: "https://ik.imagekit.io/kxh5yidni/Amaashop/herosectionfreshgroceries.png",
  },
  {
    id: 2,
    title: "Organic & Healthy Choices",
    subtitle: "Certified organic produce for a healthier you",
    cta: "Explore",
    href: "/shop?category=Fruits%20%26%20Vegetables",
    image: "https://ik.imagekit.io/kxh5yidni/Amaashop/herosectionorganic&healthy.png",
  },
  {
    id: 3,
    title: "Fresh Fruits",
    subtitle: "Sweet, juicy and picked at peak ripeness",
    cta: "Shop Fruits",
    href: "/shop?category=Fruits%20%26%20Vegetables",
    image: "https://ik.imagekit.io/kxh5yidni/Amaashop/herosectionfruits.png",
  },
  {
    id: 4,
    title: "Fresh Vegetables",
    subtitle: "Crisp, farm-picked veggies delivered to your door",
    cta: "Shop Vegetables",
    href: "/shop?category=Fruits%20%26%20Vegetables",
    image: "https://ik.imagekit.io/kxh5yidni/Amaashop/herosectionvegetables.png",
  },
  {
    id: 5,
    title: "Fresh Baked Daily",
    subtitle: "Artisan breads and bakery favorites, oven-fresh every morning",
    cta: "Shop Bakery",
    href: "/shop?category=Breads%20%26%20Bakery",
    image: "https://ik.imagekit.io/kxh5yidni/Amaashop/herosectionfreshbakeddaily.png",
  },
];
