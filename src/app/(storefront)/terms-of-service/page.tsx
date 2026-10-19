import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `The terms that govern your use of ${SITE_NAME}.`,
  alternates: { canonical: "/terms-of-service" },
};

const LAST_UPDATED = "August 23, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-neutral-800">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-neutral-600">{children}</div>
    </section>
  );
}

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold text-neutral-800">Terms of Service</h1>
      <p className="mt-2 text-sm text-neutral-500">Last updated: {LAST_UPDATED}</p>

      <Section title="Orders">
        <p>
          Placing an order is an offer to purchase — we confirm it once payment and stock are verified. Prices and
          availability are checked again at checkout, so what you see on a product page may occasionally differ from
          what&apos;s charged if stock changes between viewing and ordering.
        </p>
      </Section>

      <Section title="Delivery">
        <p>
          Delivery windows shown at checkout (standard or express) are estimates, not guarantees — actual timing can
          vary with location and demand.
        </p>
      </Section>

      <Section title="Accounts">
        <p>
          Creating an account is optional — checkout works as a guest. If you do create one, you&apos;re responsible
          for keeping your login credentials secure.
        </p>
      </Section>

      <Section title="Acceptable use">
        <p>
          Don&apos;t use {SITE_NAME} to place fraudulent orders, scrape the catalog at volume, or attempt to
          circumvent security controls.
        </p>
      </Section>

      <Section title="Changes">
        <p>We may update these terms as the service evolves. Continued use after a change means you accept it.</p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about these terms? Reach us through our{" "}
          <a href="/contact" className="font-medium text-emerald-600 hover:underline">
            Contact page
          </a>
          .
        </p>
      </Section>
    </div>
  );
}
