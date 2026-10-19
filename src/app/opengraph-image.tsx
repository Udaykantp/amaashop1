import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants";

export const runtime = "nodejs";
export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #065f46 0%, #059669 55%, #34d399 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 34,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            opacity: 0.85,
          }}
        >
          {SITE_NAME}
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 68,
            fontWeight: 700,
            lineHeight: 1.1,
            maxWidth: 960,
          }}
        >
          {SITE_TAGLINE}
        </div>
        <div style={{ marginTop: 28, fontSize: 30, opacity: 0.9 }}>
          Genuine products · Honest prices · Delivered across India
        </div>
      </div>
    ),
    { ...size },
  );
}
