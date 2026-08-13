// app/opengraph-image.tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Zey Search — AI Search Engine";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Next.js picks this file up automatically by its filename and injects it
// into openGraph/twitter image metadata — no manual wiring needed in layout.tsx.
// NOTE: satori (the renderer behind ImageResponse) only supports flexbox
// layout, so every text node below needs an explicit `display: "flex"`.
export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #020617 0%, #064e3b 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 96,
              height: 96,
              borderRadius: 20,
              background: "rgba(16, 185, 129, 0.15)",
              border: "2px solid rgba(16, 185, 129, 0.5)",
              color: "#34d399",
              fontSize: 56,
              fontWeight: 800,
            }}
          >
            Z
          </div>
          <div style={{ display: "flex", fontSize: 80, fontWeight: 800, color: "white", letterSpacing: -2 }}>
            Zey Search
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#6ee7b7", marginTop: 28 }}>
          Mesin pencari berbasis AI — ringkas, cepat, akurat
        </div>
      </div>
    ),
    { ...size }
  );
}
