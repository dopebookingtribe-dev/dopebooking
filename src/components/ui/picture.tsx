import Image, { getImageProps } from "next/image";
import type { CSSProperties } from "react";

export type PictureSource = {
  url: string;
  alt: string;
  position?: string;
};

/** A separate photo for phones and the screens that should get it. */
export type MobilePicture = {
  image: PictureSource;
  /** Media query for <source>, e.g. "(orientation: portrait)". */
  media: string;
  /** Class that swaps object-position to var(--focus-mobile) on those screens. */
  focusClass: string;
};

/**
 * A cover-cropped image that fills its (positioned) parent. With `mobile`,
 * phones get their own photo and focus point through <picture> (only the
 * one that matches is downloaded); without it, everyone gets `image`.
 */
export function Picture({
  image,
  mobile,
  sizes,
  priority = false,
  decorative = false,
  className = "",
}: {
  image: PictureSource;
  mobile?: MobilePicture | null;
  sizes: string;
  priority?: boolean;
  /** Empty alt when nearby text already names the subject. */
  decorative?: boolean;
  className?: string;
}) {
  const alt = decorative ? "" : image.alt;
  if (!mobile) {
    return (
      <Image
        src={image.url}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        style={{ objectPosition: image.position ?? "50% 50%" }}
        className={`object-cover ${className}`}
      />
    );
  }

  const common = { alt, fill: true, sizes } as const;
  const {
    props: { srcSet: mobileSrcSet },
  } = getImageProps({ ...common, src: mobile.image.url });
  const { props } = getImageProps({
    ...common,
    src: image.url,
    ...(priority ? { fetchPriority: "high", loading: "eager" } : {}),
  });
  return (
    <picture>
      <source media={mobile.media} srcSet={mobileSrcSet} sizes={sizes} />
      {/* The <img> next/image would render, fed by two sources. */}
      {/* eslint-disable-next-line jsx-a11y/alt-text -- alt comes from props */}
      <img
        {...props}
        style={
          {
            ...props.style,
            "--focus": image.position ?? "50% 50%",
            "--focus-mobile": mobile.image.position ?? "50% 50%",
          } as CSSProperties
        }
        className={`object-cover [object-position:var(--focus)] ${mobile.focusClass} ${className}`}
      />
    </picture>
  );
}
