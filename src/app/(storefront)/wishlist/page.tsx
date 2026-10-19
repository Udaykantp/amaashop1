import type { Metadata } from "next";
import { WishlistView } from "@/components/wishlist/wishlist-view";

export const metadata: Metadata = {
  title: "My Wishlist",
  robots: { index: false, follow: false },
};

export default function WishlistPage() {
  return <WishlistView />;
}
