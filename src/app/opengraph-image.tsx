import { ImageResponse } from "next/og";
import { STRING_ART } from "@/components/site/string-art";

// Default share image for every page without its own photo.
export const alt = "DopeBooking, international psytrance artist agency";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const THREADS = ["#ff5ca8", "#ffb23f", "#5be0e6"];
const R = STRING_ART.radius;

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: "#15112b",
        color: "#efebfa",
      }}
    >
      <svg
        width={760}
        height={760}
        viewBox={`${-R} ${-R} ${R * 2} ${R * 2}`}
        style={{ position: "absolute", right: -170, top: -65 }}
      >
        {STRING_ART.sectors.map((threads, s) =>
          threads.map((t, i) => (
            <line
              key={`${s}-${i}`}
              {...t}
              stroke={THREADS[s % THREADS.length]}
              strokeWidth={1.6}
            />
          )),
        )}
      </svg>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: 72,
        }}
      >
        <div style={{ fontSize: 112, fontWeight: 800, letterSpacing: -2 }}>
          DopeBooking
        </div>
        <div style={{ marginTop: 20, fontSize: 38, color: "#aca5cb" }}>
          Psytrance artists and festival services
        </div>
      </div>
    </div>,
    size,
  );
}
