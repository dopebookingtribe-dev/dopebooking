import Image from "next/image";

export type PictureSource = {
  url: string;
  alt: string;
  position?: string;
};

/** A cover-cropped image that fills its (positioned) parent. */
export function Picture({
  image,
  sizes,
  priority = false,
  decorative = false,
  className = "",
}: {
  image: PictureSource;
  sizes: string;
  priority?: boolean;
  /** Empty alt when nearby text already names the subject. */
  decorative?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={image.url}
      alt={decorative ? "" : image.alt}
      fill
      priority={priority}
      sizes={sizes}
      style={{ objectPosition: image.position ?? "50% 50%" }}
      className={`object-cover ${className}`}
    />
  );
}
