import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { SocialLinks } from "@/components/layout/social-links";
import { CATEGORY_NAV, SITE_DESCRIPTION } from "@/lib/constants";

const COMPANY_LINKS = [
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Track Order", href: "/track-order" },
];

const ACCOUNT_LINKS = [
  { label: "My Account", href: "/account" },
  { label: "My Orders", href: "/account/orders" },
  { label: "Wishlist", href: "/wishlist" },
  { label: "Cart", href: "/cart" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms of Service", href: "/terms-of-service" },
];

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">{title}</h3>
      <ul className="space-y-2.5 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-neutral-400 transition-colors hover:text-emerald-400">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FooterLinksGrid() {
  return (
    <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
      <div className="col-span-2 sm:col-span-3 lg:col-span-1">
        <div className="mb-4 inline-flex rounded-lg bg-white px-2.5 py-1.5 shadow-sm">
          <Logo variant="footer" className="flex items-center" />
        </div>
        <p className="max-w-xs text-sm leading-relaxed text-neutral-400">{SITE_DESCRIPTION}</p>
        <ul className="mt-4 space-y-2 text-sm text-neutral-400">
          <li className="flex items-center gap-2">
            <MapPin size={16} className="shrink-0 text-emerald-500" />
            Noida, Uttar Pradesh
          </li>
          <li className="flex items-center gap-2">
            <Phone size={16} className="shrink-0 text-emerald-500" />
            +91 00000 00000
          </li>
          <li className="flex items-center gap-2">
            <Mail size={16} className="shrink-0 text-emerald-500" />
            support@amaashop.com
          </li>
        </ul>
        <div className="mt-4">
          <SocialLinks />
        </div>
      </div>

      <FooterColumn
        title="Shop"
        links={[
          { label: "All Products", href: "/shop" },
          ...CATEGORY_NAV.slice(0, 4).map((c) => ({ label: c.name, href: `/category/${c.slug}` })),
        ]}
      />
      <FooterColumn title="Company" links={COMPANY_LINKS} />
      <FooterColumn title="Your Account" links={ACCOUNT_LINKS} />
      <FooterColumn title="Legal" links={LEGAL_LINKS} />
    </div>
  );
}
