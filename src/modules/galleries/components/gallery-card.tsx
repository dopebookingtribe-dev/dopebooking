import Link from "next/link";
import { DemoBadge } from "@/components/ui/demo-badge";
import { Picture } from "@/components/ui/picture";
import type { GalleryCard as GalleryCardData } from "../queries";

export function GalleryCard({
  gallery,
  priority = false,
  showDemo = true,
}: {
  gallery: GalleryCardData;
  priority?: boolean;
  showDemo?: boolean;
}) {
  return (
    <Link
      href={`/gallery/${gallery.slug}`}
      className="group relative block overflow-hidden rounded-(--radius) bg-surface-2"
    >
      <div className="relative aspect-[3/2]">
        {gallery.cover ? (
          <Picture
            image={gallery.cover}
            decorative
            priority={priority}
            sizes="(min-width: 1024px) 45vw, 92vw"
            className="transition-transform duration-700 ease-(--ease-out) group-hover:scale-[1.03]"
          />
        ) : null}
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-t from-bg/90 via-bg/10 to-transparent"
        />
      </div>
      {gallery.isDemo && showDemo ? (
        <DemoBadge className="absolute top-4 left-4" />
      ) : null}
      <h3 className="absolute inset-x-0 bottom-0 p-5 font-display text-2xl leading-tight transition-colors group-hover:text-accent sm:p-6 sm:text-3xl">
        {gallery.title}
      </h3>
    </Link>
  );
}
