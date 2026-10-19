import { WaveDivider } from "@/components/layout/footer/wave-divider";
import { NewsletterSignup } from "@/components/layout/footer/newsletter-signup";
import { FooterLinksGrid } from "@/components/layout/footer/footer-links-grid";
import { FooterTrustBar } from "@/components/layout/footer/footer-trust-bar";
import { PaymentBadges } from "@/components/layout/footer/payment-badges";
import { FooterCurrencySwitcher } from "@/components/layout/footer/footer-currency-switcher";
import { BackToTopButton } from "@/components/layout/footer/back-to-top-button";

export function Footer() {
  return (
    <footer className="mt-8 w-full bg-neutral-900 text-neutral-300 lg:mt-16">
      <WaveDivider />

      <div className="mx-auto max-w-7xl px-4 pb-8 lg:px-8">
        <NewsletterSignup />

        <div className="pt-10 pb-8 lg:pt-12">
          <FooterLinksGrid />
        </div>

        <FooterTrustBar />

        <div className="flex flex-col items-start gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <PaymentBadges />
          <FooterCurrencySwitcher />
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-neutral-500 sm:flex-row lg:px-8">
          <p>&copy; {new Date().getFullYear()} AmaaShop. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="/privacy-policy" className="hover:text-emerald-400">Privacy Policy</a>
            <a href="/terms-of-service" className="hover:text-emerald-400">Terms of Service</a>
            <BackToTopButton />
          </div>
        </div>
      </div>
    </footer>
  );
}
