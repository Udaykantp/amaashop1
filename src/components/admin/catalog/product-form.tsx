"use client";

import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import type { ProductStatus } from "@/server/enums";
import {
  createProductAction,
  updateProductAction,
  uploadProductImageAction,
} from "@/actions/catalog";
import { useAdminToast } from "@/components/admin/admin-toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SeoPreview } from "@/components/admin/catalog/seo-preview";
import { SEO_LIMITS, type SeoProduct } from "@/lib/catalog/seo";
import { slugify } from "@/lib/catalog/slugify";
import { SITE_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

const GST_OPTIONS = [
  { bps: 0, label: "0% (exempt)" },
  { bps: 500, label: "5%" },
  { bps: 1200, label: "12%" },
  { bps: 1800, label: "18%" },
];

export interface ProductFormValues {
  name: string;
  slug: string;
  sku: string;
  subtitle: string;
  description: string;
  brand: string;
  categoryId: string;
  status: ProductStatus;
  tagsText: string;
  mrp: string;
  sellingPrice: string;
  gstRateBps: number;
  hsnCode: string;
  gtin: string;
  unitLabel: string;
  weightGrams: string;
  pv: string;
  bv: string;
  autoshipEligible: boolean;
  images: { url: string; alt: string }[];
  metaTitle: string;
  metaDescription: string;
  ogImageUrl: string;
  canonicalUrl: string;
  noIndex: boolean;
  focusKeyword: string;
  isFeatured: boolean;
  isPopular: boolean;
  isLatest: boolean;
  openingStock: string;
  warehouseId: string;
}

const EMPTY: ProductFormValues = {
  name: "",
  slug: "",
  sku: "",
  subtitle: "",
  description: "",
  brand: "",
  categoryId: "",
  status: "DRAFT",
  tagsText: "",
  mrp: "",
  sellingPrice: "",
  gstRateBps: 0,
  hsnCode: "",
  gtin: "",
  unitLabel: "",
  weightGrams: "",
  pv: "0",
  bv: "0",
  autoshipEligible: false,
  images: [],
  metaTitle: "",
  metaDescription: "",
  ogImageUrl: "",
  canonicalUrl: "",
  noIndex: false,
  focusKeyword: "",
  isFeatured: false,
  isPopular: false,
  isLatest: false,
  openingStock: "",
  warehouseId: "",
};

// ── small presentational helpers ──────────────────────────────────────────

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-card">
      <h2 className="font-serif text-base font-medium text-foreground">{title}</h2>
      {desc ? <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p> : null}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

const selectCls =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
const textareaCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-ring"
      />
      <span className="text-sm">
        <span className="font-medium text-foreground">{label}</span>
        {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
      </span>
    </label>
  );
}

function UploadButton({
  onUploaded,
  label = "Upload image",
  className,
}: {
  onUploaded: (url: string) => void;
  label?: string;
  className?: string;
}) {
  const toast = useAdminToast();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr(null);
    setBusy(true);
    const fd = new FormData();
    fd.set("file", file);
    const res = await uploadProductImageAction(fd);
    setBusy(false);
    if (res.ok) {
      onUploaded(res.url);
      toast.show("Image uploaded.", "success");
    } else {
      setErr(res.error);
      toast.show(res.error, "error");
    }
  }

  return (
    <span className={className}>
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
        onChange={onPick}
        className="hidden"
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => ref.current?.click()}
        className="inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium hover:bg-secondary disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {busy ? "Uploading…" : label}
      </button>
      {err ? <span className="ml-2 text-xs text-destructive">{err}</span> : null}
    </span>
  );
}

function Counter({ value, ideal, hard }: { value: number; ideal: number; hard: number }) {
  const tone =
    value === 0
      ? "text-muted-foreground"
      : value <= ideal
        ? "text-success"
        : value <= hard
          ? "text-warning"
          : "text-destructive";
  return (
    <span className={cn("tabular-nums", tone)}>
      {value}/{ideal}
    </span>
  );
}

// ── main form ─────────────────────────────────────────────────────────────

export function ProductForm({
  mode,
  productId,
  initial,
  categories,
  warehouses,
}: {
  mode: "create" | "edit";
  productId?: string;
  initial?: Partial<ProductFormValues>;
  categories: { id: string; name: string }[];
  warehouses: { id: string; name: string; siteName: string }[];
}) {
  const router = useRouter();
  const toast = useAdminToast();
  const [pending, start] = useTransition();
  const [v, setV] = useState<ProductFormValues>({ ...EMPTY, ...initial });
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const set = <K extends keyof ProductFormValues>(k: K, val: ProductFormValues[K]) =>
    setV((s) => ({ ...s, [k]: val }));

  const effectiveSlug = slugTouched ? v.slug : slugify(v.name);

  const seoProduct: SeoProduct = useMemo(
    () => ({
      name: v.name || "Untitled product",
      slug: effectiveSlug,
      subtitle: v.subtitle,
      description: v.description,
      brand: v.brand,
      categoryName: categories.find((c) => c.id === v.categoryId)?.name ?? null,
      metaTitle: v.metaTitle,
      metaDescription: v.metaDescription,
      focusKeyword: v.focusKeyword,
      canonicalUrl: v.canonicalUrl,
      noIndex: v.noIndex,
      gtin: v.gtin,
      sku: v.sku,
      mrp: Number(v.mrp) || 0,
      sellingPrice: Number(v.sellingPrice) || 0,
      imageUrl: v.images[0]?.url ?? null,
      ogImageUrl: v.ogImageUrl,
      images: v.images.map((i) => i.url).filter(Boolean),
    }),
    [v, effectiveSlug, categories],
  );

  const discount =
    Number(v.mrp) > 0 && Number(v.sellingPrice) > 0 && Number(v.sellingPrice) < Number(v.mrp)
      ? Math.round(((Number(v.mrp) - Number(v.sellingPrice)) / Number(v.mrp)) * 100)
      : 0;

  // image list ops
  const imgOp = {
    add: () => set("images", [...v.images, { url: "", alt: "" }]),
    remove: (i: number) => set("images", v.images.filter((_, idx) => idx !== i)),
    patch: (i: number, key: "url" | "alt", val: string) =>
      set("images", v.images.map((img, idx) => (idx === i ? { ...img, [key]: val } : img))),
    move: (i: number, dir: -1 | 1) => {
      const j = i + dir;
      if (j < 0 || j >= v.images.length) return;
      const next = [...v.images];
      [next[i], next[j]] = [next[j]!, next[i]!];
      set("images", next);
    },
  };

  function submit(overrideStatus?: ProductStatus) {
    const status = overrideStatus ?? v.status;
    setErrors({});
    setBanner(null);

    const payload = {
      name: v.name.trim(),
      slug: effectiveSlug || undefined,
      sku: v.sku.trim() || undefined,
      subtitle: v.subtitle.trim(),
      description: v.description.trim(),
      brand: v.brand.trim(),
      categoryId: v.categoryId || undefined,
      tags: v.tagsText.split(",").map((t) => t.trim()).filter(Boolean),
      status,
      mrp: Number(v.mrp),
      sellingPrice: Number(v.sellingPrice),
      gstRateBps: v.gstRateBps,
      hsnCode: v.hsnCode.trim(),
      gtin: v.gtin.trim(),
      unitLabel: v.unitLabel.trim(),
      weightGrams: v.weightGrams ? Number(v.weightGrams) : null,
      pv: Number(v.pv) || 0,
      bv: Number(v.bv) || 0,
      autoshipEligible: v.autoshipEligible,
      images: v.images.map((i) => ({ url: i.url.trim(), alt: i.alt.trim() })).filter((i) => i.url),
      metaTitle: v.metaTitle.trim(),
      metaDescription: v.metaDescription.trim(),
      ogImageUrl: v.ogImageUrl.trim(),
      canonicalUrl: v.canonicalUrl.trim(),
      noIndex: v.noIndex,
      focusKeyword: v.focusKeyword.trim(),
      isFeatured: v.isFeatured,
      isPopular: v.isPopular,
      isLatest: v.isLatest,
      ...(mode === "create"
        ? {
            openingStock: v.openingStock ? Number(v.openingStock) : null,
            warehouseId: v.warehouseId || undefined,
          }
        : {}),
    };

    start(async () => {
      const res =
        mode === "create"
          ? await createProductAction(payload)
          : await updateProductAction(productId!, payload);

      if (res.ok) {
        set("status", status);
        toast.show(res.message ?? (mode === "create" ? "Product created." : "Saved."), "success");
        if (mode === "create") {
          router.push(`/admin/catalog/${res.id}`);
          router.refresh();
        } else {
          setBanner({ tone: "ok", text: res.message ?? "Saved." });
          router.refresh();
        }
      } else {
        setErrors(res.fieldErrors ?? {});
        setBanner({ tone: "err", text: res.error });
        toast.show(res.error, "error");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* ── left: form ── */}
      <div className="space-y-6">
        {banner ? (
          <p
            className={cn(
              "rounded-lg px-3 py-2 text-sm",
              banner.tone === "ok"
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive",
            )}
          >
            {banner.text}
          </p>
        ) : null}

        <Section title="General" desc="The basics customers and search engines see first.">
          <Field label="Product name" htmlFor="name" error={errors.name}>
            <Input
              id="name"
              value={v.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Cold-Pressed Groundnut Oil"
            />
          </Field>

          <Field
            label="URL slug"
            htmlFor="slug"
            error={errors.slug}
            hint={
              <>
                {SITE_URL.replace(/^https?:\/\//, "")}/product/
                <span className="font-medium text-foreground">{effectiveSlug || "…"}</span>
              </>
            }
          >
            <Input
              id="slug"
              value={effectiveSlug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", slugify(e.target.value));
              }}
              placeholder="auto-generated from the name"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Brand" htmlFor="brand" error={errors.brand}>
              <Input id="brand" value={v.brand} onChange={(e) => set("brand", e.target.value)} />
            </Field>
            <Field label="Category" htmlFor="categoryId" error={errors.categoryId}>
              <select
                id="categoryId"
                className={selectCls}
                value={v.categoryId}
                onChange={(e) => set("categoryId", e.target.value)}
              >
                <option value="">— none —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Short subtitle" htmlFor="subtitle" error={errors.subtitle} hint="One line shown under the title and used as the SEO description fallback.">
            <Input
              id="subtitle"
              value={v.subtitle}
              onChange={(e) => set("subtitle", e.target.value)}
              placeholder="e.g. Wood-pressed, unrefined, 1 L"
            />
          </Field>

          <Field
            label="Description"
            htmlFor="description"
            error={errors.description}
            hint="Long form. 120+ words reads as substantial; thin content ranks poorly."
          >
            <textarea
              id="description"
              rows={8}
              className={textareaCls}
              value={v.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What it is, how it's made, why it's better, how to use it…"
            />
          </Field>

          <Field label="Tags" htmlFor="tags" error={errors.tags} hint="Comma-separated. Used for internal search + related products.">
            <Input
              id="tags"
              value={v.tagsText}
              onChange={(e) => set("tagsText", e.target.value)}
              placeholder="oil, cooking, wood-pressed"
            />
          </Field>
        </Section>

        <Section title="Media" desc="First image is the hero shot and the social/OpenGraph fallback. Upload to Firebase Storage or paste a URL.">
          {v.images.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-8 text-sm text-muted-foreground">
              <ImagePlus className="h-6 w-6" />
              <div className="flex items-center gap-2">
                <UploadButton onUploaded={(url) => set("images", [{ url, alt: "" }])} label="Upload the first image" />
                <button type="button" onClick={imgOp.add} className="text-xs underline hover:text-foreground">
                  or paste a URL
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {v.images.map((img, i) => (
                <div key={i} className="flex gap-3 rounded-lg border p-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                    {img.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img.url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImagePlus className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={img.url}
                        onChange={(e) => imgOp.patch(i, "url", e.target.value)}
                        placeholder="https://…/image.jpg"
                      />
                      <UploadButton
                        onUploaded={(url) => imgOp.patch(i, "url", url)}
                        label="Upload"
                        className="shrink-0"
                      />
                    </div>
                    <Input
                      value={img.alt}
                      onChange={(e) => imgOp.patch(i, "alt", e.target.value)}
                      placeholder="Alt text — describe the image for accessibility & Google Images"
                    />
                    {i === 0 ? (
                      <p className="text-[11px] text-muted-foreground">Primary image</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => imgOp.move(i, -1)}
                      disabled={i === 0}
                      className="rounded border p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => imgOp.move(i, 1)}
                      disabled={i === v.images.length - 1}
                      className="rounded border p-1 text-muted-foreground hover:bg-secondary disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => imgOp.remove(i)}
                      className="rounded border p-1 text-destructive hover:bg-destructive/10"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={imgOp.add} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Add URL row
                </Button>
                <UploadButton onUploaded={(url) => set("images", [...v.images, { url, alt: "" }])} label="Upload image" />
              </div>
            </div>
          )}
          {errors.images ? <p className="text-xs text-destructive">{errors.images}</p> : null}
        </Section>

        <Section title="Pricing & tax" desc="Rupees, inclusive of GST at the rate below (Indian retail convention).">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="MRP (₹)" htmlFor="mrp" error={errors.mrp}>
              <Input
                id="mrp"
                inputMode="decimal"
                value={v.mrp}
                onChange={(e) => set("mrp", e.target.value)}
                placeholder="0.00"
              />
            </Field>
            <Field
              label="Selling price (₹)"
              htmlFor="sellingPrice"
              error={errors.sellingPrice}
              hint={discount > 0 ? `${discount}% off MRP` : undefined}
            >
              <Input
                id="sellingPrice"
                inputMode="decimal"
                value={v.sellingPrice}
                onChange={(e) => set("sellingPrice", e.target.value)}
                placeholder="0.00"
              />
            </Field>
            <Field label="GST rate" htmlFor="gst" error={errors.gstRateBps}>
              <select
                id="gst"
                className={selectCls}
                value={v.gstRateBps}
                onChange={(e) => set("gstRateBps", Number(e.target.value))}
              >
                {GST_OPTIONS.map((g) => (
                  <option key={g.bps} value={g.bps}>
                    {g.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="HSN code" htmlFor="hsn" error={errors.hsnCode}>
              <Input id="hsn" value={v.hsnCode} onChange={(e) => set("hsnCode", e.target.value)} />
            </Field>
            <Field label="Barcode / GTIN" htmlFor="gtin" error={errors.gtin} hint="EAN/UPC — helps Google match your offer" className="sm:col-span-2">
              <Input
                id="gtin"
                value={v.gtin}
                onChange={(e) => set("gtin", e.target.value)}
                placeholder="8 / 12 / 13 / 14 digits"
              />
            </Field>
          </div>
        </Section>

        <Section
          title="Network volume (PV / BV)"
          desc="Commission is paid on VOLUME, never on price. Set these deliberately per SKU."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="PV — Personal Volume" htmlFor="pv" error={errors.pv}>
              <Input id="pv" inputMode="decimal" value={v.pv} onChange={(e) => set("pv", e.target.value)} />
            </Field>
            <Field label="BV — Business Volume (commissionable)" htmlFor="bv" error={errors.bv}>
              <Input id="bv" inputMode="decimal" value={v.bv} onChange={(e) => set("bv", e.target.value)} />
            </Field>
          </div>
          <Toggle
            checked={v.autoshipEligible}
            onChange={(x) => set("autoshipEligible", x)}
            label="Autoship eligible"
            hint="Can be added to a distributor's recurring monthly kit."
          />
        </Section>

        <Section title="Logistics" desc="Used for dispatch, shipping rates and the pack-size label.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Unit label" htmlFor="unit" error={errors.unitLabel} hint='e.g. "500 g", "1 L", "pack of 6"'>
              <Input id="unit" value={v.unitLabel} onChange={(e) => set("unitLabel", e.target.value)} />
            </Field>
            <Field label="Shipping weight (grams)" htmlFor="wt" error={errors.weightGrams}>
              <Input
                id="wt"
                inputMode="numeric"
                value={v.weightGrams}
                onChange={(e) => set("weightGrams", e.target.value)}
              />
            </Field>
          </div>
          {mode === "create" && warehouses.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Opening stock" htmlFor="stock" error={errors.openingStock} hint="Optional — logged to the stock ledger as PURCHASE_IN.">
                <Input
                  id="stock"
                  inputMode="numeric"
                  value={v.openingStock}
                  onChange={(e) => set("openingStock", e.target.value)}
                />
              </Field>
              <Field label="Into warehouse" htmlFor="wh" error={errors.warehouseId}>
                <select
                  id="wh"
                  className={selectCls}
                  value={v.warehouseId}
                  onChange={(e) => set("warehouseId", e.target.value)}
                >
                  <option value="">— select —</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} · {w.siteName}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          ) : null}
        </Section>

        <Section title="Search engine optimisation" desc="Overrides for the product's search + social appearance.">
          <Field label="Focus keyword" htmlFor="fk" error={errors.focusKeyword} hint="The primary phrase you want this page to rank for. Drives the checks on the right.">
            <Input id="fk" value={v.focusKeyword} onChange={(e) => set("focusKeyword", e.target.value)} />
          </Field>

          <Field
            label="Meta title"
            htmlFor="mt"
            error={errors.metaTitle}
            hint={
              <>
                Overrides <code className="rounded bg-muted px-1">&lt;title&gt;</code>. Left blank →
                built from brand + name.{" "}
                <Counter value={v.metaTitle.length} ideal={SEO_LIMITS.titleIdealMax} hard={SEO_LIMITS.titleHardMax} />
              </>
            }
          >
            <Input id="mt" value={v.metaTitle} onChange={(e) => set("metaTitle", e.target.value)} />
          </Field>

          <Field
            label="Meta description"
            htmlFor="md"
            error={errors.metaDescription}
            hint={
              <>
                Shown in search results.{" "}
                <Counter
                  value={v.metaDescription.length}
                  ideal={SEO_LIMITS.descIdealMax}
                  hard={SEO_LIMITS.descHardMax}
                />
              </>
            }
          >
            <textarea
              id="md"
              rows={3}
              className={textareaCls}
              value={v.metaDescription}
              onChange={(e) => set("metaDescription", e.target.value)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Social image URL (og:image)" htmlFor="og" error={errors.ogImageUrl} hint="1200×630. Falls back to the hero image.">
              <Input id="og" value={v.ogImageUrl} onChange={(e) => set("ogImageUrl", e.target.value)} />
            </Field>
            <Field label="Canonical URL override" htmlFor="canon" error={errors.canonicalUrl} hint="Only if this content is syndicated from elsewhere.">
              <Input id="canon" value={v.canonicalUrl} onChange={(e) => set("canonicalUrl", e.target.value)} />
            </Field>
          </div>

          <Toggle
            checked={v.noIndex}
            onChange={(x) => set("noIndex", x)}
            label="Hide from search engines (noindex)"
            hint="The page stays reachable but won't be indexed."
          />
        </Section>

        <Section title="Merchandising" desc="Where this product surfaces on the storefront.">
          <Toggle checked={v.isFeatured} onChange={(x) => set("isFeatured", x)} label="Featured" />
          <Toggle checked={v.isPopular} onChange={(x) => set("isPopular", x)} label="Popular" />
          <Toggle checked={v.isLatest} onChange={(x) => set("isLatest", x)} label="Show in “New arrivals”" />
        </Section>
      </div>

      {/* ── right: publish + preview ── */}
      <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <Field label="Status" htmlFor="status">
            <select
              id="status"
              className={selectCls}
              value={v.status}
              onChange={(e) => set("status", e.target.value as ProductStatus)}
            >
              <option value="DRAFT">Draft — not on the store</option>
              <option value="ACTIVE">Active — live</option>
              <option value="ARCHIVED">Archived — hidden</option>
            </select>
          </Field>

          <div className="mt-4 flex flex-col gap-2">
            <Button onClick={() => submit()} disabled={pending} className="w-full gap-2">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {mode === "create" ? "Create product" : "Save changes"}
            </Button>
            {v.status !== "ACTIVE" ? (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => submit("ACTIVE")}
                className="w-full"
              >
                {mode === "create" ? "Create & publish" : "Save & publish"}
              </Button>
            ) : null}
            <Button asChild variant="ghost" className="w-full">
              <Link href="/admin/catalog">Cancel</Link>
            </Button>
          </div>

          <dl className="mt-4 space-y-1 border-t pt-4 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <dt>MRP</dt>
              <dd className="tabular-nums text-foreground">₹{v.mrp || "0"}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Selling</dt>
              <dd className="tabular-nums text-foreground">
                ₹{v.sellingPrice || "0"} {discount > 0 ? `(−${discount}%)` : ""}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>PV / BV</dt>
              <dd className="tabular-nums text-foreground">
                {v.pv || "0"} / {v.bv || "0"}
              </dd>
            </div>
          </dl>
        </div>

        <SeoPreview product={seoProduct} />
      </div>
    </div>
  );
}
