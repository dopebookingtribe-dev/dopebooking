import { ImageResponse } from "next/og";

// Default share image for every page without its own photo.
export const alt = "DopeBooking — international psytrance artist agency";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background:
          "radial-gradient(120% 80% at 75% 10%, #1f2a0b 0%, #0a0a0c 55%), #0a0a0c",
        color: "#f3f0ea",
      }}
    >
      <div style={{ fontSize: 28, letterSpacing: 8, color: "#a6a3ad" }}>
        INTERNATIONAL PSYTRANCE AGENCY
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 120, lineHeight: 1, letterSpacing: -3 }}>
          DopeBooking
        </div>
        <div style={{ marginTop: 24, fontSize: 40, color: "#c6f432" }}>
          Artists · Events · Festival services · Shop
        </div>
      </div>
    </div>,
    size,
  );
}
