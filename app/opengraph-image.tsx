import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/seo/site";

export const runtime = "nodejs";
export const alt = `${SITE_NAME} — self-hosted work assistant`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px",
        background: "linear-gradient(145deg, #0c0f12 0%, #151b22 55%, #1a2330 100%)",
        color: "#f4f7fa",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "20px",
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: "-0.04em",
          }}
        >
          B
        </div>
        <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-0.04em" }}>{SITE_NAME}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 900 }}>
        <div style={{ fontSize: 54, fontWeight: 650, letterSpacing: "-0.045em", lineHeight: 1.1 }}>
          Your team’s work assistant, on your host.
        </div>
        <div style={{ fontSize: 28, color: "rgba(244,247,250,0.72)", lineHeight: 1.35 }}>
          {SITE_TAGLINE}
        </div>
      </div>
      <div style={{ fontSize: 22, color: "rgba(244,247,250,0.5)" }}>Runs on your machine.</div>
    </div>,
    { ...size },
  );
}
