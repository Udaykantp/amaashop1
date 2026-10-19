import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${SITE_NAME} collects, uses, and protects your information.`,
  alternates: { canonical: "/privacy-policy" },
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

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold text-neutral-800">Privacy Policy</h1>
      <p className="mt-2 text-sm text-neutral-500">Last updated: {LAST_UPDATED}</p>

      <Section title="What we collect">
        <p>
          When you place an order, we collect your name, email address, phone number, and delivery address to
          fulfill it. When you contact us or subscribe to updates, we collect your email and the details of your
          message. Your cart and wishlist are stored in your browser and never leave your device unless you check
          out.
        </p>
      </Section>

      <Section title="How we use it">
        <p>
          Order details are used solely to process, fulfill, and let you track your purchase. Contact form
          submissions are used to respond to your inquiry. If you sign in, your account email is used for
          authentication and to show you your own order history.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          We use a small number of essential cookies to keep you signed in and to remember your session — nothing
          used for third-party advertising or cross-site tracking.
        </p>
      </Section>

      <Section title="Sharing">
        <p>
          We don&apos;t sell your information. Order and account data is stored with our infrastructure
          provider (Google Firebase) solely to operate {SITE_NAME}.
        </p>
      </Section>

      <Section title="Your choices">
        <p>
          You can request access to, correction of, or deletion of your data at any time by reaching out through our{" "}
          <a href="/contact" className="font-medium text-emerald-600 hover:underline">
            Contact page
          </a>
          .
        </p>
      </Section>

      <Section title="Questions">
        <p>Reach us any time at support@amaashop.com.</p>
      </Section>
    </div>
  );
}
