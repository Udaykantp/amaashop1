import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { ContactForm } from "@/components/contact/contact-form";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contact Us",
  description: `Get in touch with the ${SITE_NAME} team — questions, order support, or feedback, we're here to help.`,
  alternates: { canonical: "/contact" },
};

const CONTACT_INFO = [
  { icon: MapPin, title: "Visit Us", text: "123 Grocery Lane, Fresh City, FC 12345" },
  { icon: Phone, title: "Call Us", text: "+1 (555) 123-4567" },
  { icon: Mail, title: "Email Us", text: "support@amaashop.com" },
];

export default function ContactPage() {
  return (
    <div>
      <JsonLd data={breadcrumbSchema([{ name: "Home", url: "/" }, { name: "Contact", url: "/contact" }])} />

      <section className="bg-neutral-50 py-16">
        <div className="mx-auto max-w-7xl px-4 text-center lg:px-8">
          <h1 className="text-3xl font-bold text-neutral-800 md:text-4xl">Get in Touch</h1>
          <p className="mx-auto mt-4 max-w-2xl text-neutral-600">
            Have a question, suggestion, or need help with your order? We&apos;re here to help. Reach out and
            we&apos;ll get back to you as soon as possible.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-4">
            {CONTACT_INFO.map((item) => (
              <div key={item.title} className="flex items-start gap-4 rounded-xl border border-neutral-100 bg-white p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <item.icon size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-800">{item.title}</h3>
                  <p className="mt-1 text-sm text-neutral-600">{item.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-xl border border-neutral-100 bg-white p-6 md:p-8">
              <h2 className="text-xl font-bold text-neutral-800">Send a Message</h2>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
