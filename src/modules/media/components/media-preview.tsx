import type { MediaKind } from "../constants";

/** Small or large preview for any library file. */
export function MediaPreview({
  kind,
  url,
  alt,
  focal = { x: 50, y: 50 },
  size = "card",
  mimeType,
}: {
  kind: MediaKind;
  url: string;
  alt: string;
  focal?: { x: number; y: number };
  size?: "card" | "large";
  mimeType?: string | null;
}) {
  const frame =
    size === "card"
      ? "aspect-[4/3] w-full overflow-hidden rounded-lg bg-surface-2"
      : "w-full overflow-hidden rounded-(--radius) bg-surface-2";

  if (kind === "image") {
    return (
      <div className={frame}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt}
          loading="lazy"
          className={
            size === "card"
              ? "size-full object-cover"
              : "max-h-[70vh] w-full object-contain"
          }
          style={{ objectPosition: `${focal.x}% ${focal.y}%` }}
        />
      </div>
    );
  }
  if (kind === "video") {
    return (
      <div className={frame}>
        <video
          controls={size === "large"}
          muted={size === "card"}
          preload="metadata"
          playsInline
          className={
            size === "card"
              ? "size-full object-cover"
              : "max-h-[70vh] w-full bg-black"
          }
        >
          <source
            src={size === "card" ? `${url}#t=1` : url}
            type={mimeType ?? undefined}
          />
        </video>
      </div>
    );
  }
  const icon = kind === "audio" ? "♫" : "PDF";
  return (
    <div
      className={`${frame} flex flex-col items-center justify-center gap-3 p-4 ${size === "card" ? "" : "py-12"}`}
    >
      <span aria-hidden className="font-display text-4xl text-accent">
        {icon}
      </span>
      {kind === "audio" ? (
        <audio controls preload="none" className="w-full max-w-md" src={url}>
          <a href={url}>Listen</a>
        </audio>
      ) : size === "large" ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm underline underline-offset-4"
        >
          Open the PDF in a new tab
        </a>
      ) : null}
    </div>
  );
}
