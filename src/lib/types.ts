export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  /** Count of live (ACTIVE) products — populated for storefront reads. */
  productCount?: number;
  /** Up to 2 real product photos representing this category, for "Shop by
   *  category" tiles (richer categories show a 2-photo collage). Empty if
   *  the category has no ACTIVE product with an image yet. */
  images?: string[];
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  old_price: number | null;
  image_url: string;
  category_id: string | null;
  unit: string | null;
  stock: number;
  rating: number;
  reviews: number;
  badge: string | null;
  is_featured: boolean;
  is_popular: boolean;
  is_latest: boolean;
  created_at: string;
  categories?: Category | null;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string;
}

export interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address: string;
  city: string;
  zip_code: string | null;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  created_at: string;
}
