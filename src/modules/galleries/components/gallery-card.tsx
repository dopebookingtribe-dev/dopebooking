import Image from "next/image";
import Link from "next/link";
import type { GalleryCard as GalleryCardData } from "../queries";

export function GalleryCard({
  gallery,
  priority = false,
}: {
  gallery: GalleryCardData;
  priority?: boolean;
}) {
  return (
    <Link href={`/gallery/${gallery.slug}`} className="group block">
      <div className="relative aspect-[3/2] overflow-hidden rounded-(--radius) bg-surface-2">
        {gallery.cover ? (
          <Image
            src={gallery.cover.url}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1024px) 45vw, 92vw"
            className="object-cover transition-transform duration-700 ease-(--ease-out) group-hover:scale-[1.03]"
          />
        ) : null}
      </div>
      <h3 className="mt-4 font-display text-3xl transition-colors group-hover:text-accent">
        {gallery.title}
      </h3>
    </Link>
  );
}
