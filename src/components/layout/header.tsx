import Link from "next/link";
import { MapPin, Phone, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { SearchBar } from "@/components/layout/search-bar";
import { HeaderIcons } from "@/components/layout/header-icons";
import { AccountMenu } from "@/components/layout/account-menu";
import { MainNav } from "@/components/layout/main-nav";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/checkout/pricing";
import { formatPrice } from "@/lib/format";

/**
 * Server-rendered shell with small client islands (`SearchBar`, `HeaderIcons`,
 * `MainNav`) for the interactive pieces — keeps most of the markup off the
 * client bundle.
 *
 * Layout: only the primary bar (logo + search + account/cart) is `sticky`.
 * The promo strip above it and the category nav below it sit in normal flow,
 * so they scroll away on the way down and the sticky bar stays compact. All
 * three are siblings of the storefront layout's flex column, which is what
 * lets the sticky bar stay pinned for the whole page (a sticky element only
 * holds while its containing block is on screen).
 */
export function Header() {
  return (
    <>
      {/* Promo / utility strip — scrolls away */}
      <div className="hidden bg-neutral-900 px-4 text-[11px] text-neutral-300 lg:block">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between">
          <ul className="flex items-center divide-x divide-white/10">
            <li className="flex items-center gap-1.5 pr-4">
              <Truck size={13} className="text-emerald-400" aria-hidden />
              Free shipping on orders over <span className="font-semibold text-white">{formatPrice(FREE_SHIPPING_THRESHOLD)}</span>
            </li>
            <li className="flex items-center gap-1.5 px-4">
              <ShieldCheck size={13} className="text-emerald-400" aria-hidden />
              100% secure payments
            </li>
            <li className="flex items-center gap-1.5 pl-4">
              <RotateCcw size={13} className="text-emerald-400" aria-hidden />
              Easy 7-day returns
            </li>
          </ul>
          <div className="flex items-center gap-4">
            <a
              href="tel:+15551234567"
              className="flex items-center gap-1.5 font-medium text-neutral-200 transition-colors hover:text-white"
            >
              <Phone size={13} className="text-emerald-400" aria-hidden />
              +1 (555) 123-4567
            </a>
            <span aria-hidden className="h-3.5 w-px bg-white/10" />
            <Link href="/track-order" className="transition-colors hover:text-white">
              Track Order
            </Link>
            <Link href="/about" className="transition-colors hover:text-white">
              About Us
            </Link>
            <Link href="/contact" className="transition-colors hover:text-white">
              Contact
            </Link>
          </div>
        </div>
      </div>

      {/* Primary bar — sticky, frosted glass with an emerald gradient hairline */}
      <header className="sticky top-0 z-50 w-full border-b border-neutral-200/70 bg-white/85 shadow-[0_1px_3px_rgba(15,23,42,0.04)] backdrop-blur-xl pt-safe relative supports-[backdrop-filter]:bg-white/75 after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-gradient-to-r after:from-transparent after:via-emerald-400/60 after:to-transparent">
        {/* Mobile */}
        <div className="lg:hidden">
          {/* Delivery location strip */}
          <div className="flex items-center gap-1.5 border-b border-emerald-100/70 bg-emerald-50/60 px-4 py-1.5 text-[11px]">
            <MapPin size={13} className="shrink-0 text-emerald-600" aria-hidden />
            <span className="text-emerald-700/70">Delivering to</span>
            <span className="truncate font-semibold text-emerald-900">Fresh City 12345</span>
          </div>

          {/* Brand row — prominent logo, quick actions right */}
          <div className="flex items-center px-4 py-2.5">
            <Logo imgClassName="h-14 w-auto" />
            <div className="ml-auto flex items-center gap-0.5">
              <HeaderIcons compact />
            </div>
          </div>

          {/* Search */}
          <div className="px-4 pb-3">
            <SearchBar variant="mobile" />
          </div>
        </div>

        {/* Desktop */}
        <div className="mx-auto hidden max-w-7xl items-center gap-8 px-6 py-3 lg:flex">
          <Logo />
          <div className="flex min-w-0 flex-1 justify-center">
            <SearchBar variant="desktop" />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <HeaderIcons />
            <span aria-hidden className="mx-1.5 h-6 w-px bg-neutral-200" />
            <AccountMenu />
          </div>
        </div>
      </header>

      {/* Category nav — scrolls away */}
      <div className="hidden lg:block">
        <MainNav />
      </div>
    </>
  );
}
