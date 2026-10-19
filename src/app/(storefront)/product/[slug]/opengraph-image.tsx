import { ImageResponse } from "next/og";
import { getProductDetailBySlug } from "@/lib/data/products";
import { SITE_NAME } from "@/lib/constants";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${SITE_NAME} product`;

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default async function ProductOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await getProductDetailBySlug(slug).catch(() => null);

  const name = p?.name ?? SITE_NAME;
  const category = p?.categories?.name ?? "Everyday essentials";
  const price = p ? inr(p.price) : "";
  const mrp = p?.old_price && p.old_price > p.price ? inr(p.old_price) : "";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              fontSize: 30,
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              color: "#059669",
              fontWeight: 700,
            }}
          >
            {SITE_NAME}
          </div>
          <div style={{ fontSize: 24, color: "#6b7280" }}>{category}</div>
        </div>

        <div
          style={{
            fontSize: 62,
            fontWeight: 700,
            color: "#111827",
            lineHeight: 1.15,
            maxWidth: 1040,
          }}
        >
          {name}
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 20 }}>
          {price ? (
            <span style={{ fontSize: 56, fontWeight: 700, color: "#065f46" }}>{price}</span>
          ) : null}
          {mrp ? (
            <span style={{ fontSize: 34, color: "#9ca3af", textDecoration: "line-through" }}>{mrp}</span>
          ) : null}
          <span style={{ marginLeft: "auto", fontSize: 26, color: "#6b7280" }}>
            Delivered across India
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
