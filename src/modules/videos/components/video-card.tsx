import Image from "next/image";
import Link from "next/link";
import type { VideoCard as VideoCardData } from "../queries";

export function VideoCard({
  video,
  priority = false,
}: {
  video: VideoCardData;
  priority?: boolean;
}) {
  return (
    <Link href={`/videos/${video.slug}`} className="group block">
      <div className="relative aspect-video overflow-hidden rounded-(--radius) bg-surface-2">
        {video.poster ? (
          <Image
            src={video.poster.url}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1024px) 45vw, 92vw"
            className="object-cover transition-transform duration-700 ease-(--ease-out) group-hover:scale-[1.03]"
          />
        ) : null}
        <span
          aria-hidden
          className="absolute bottom-3 left-3 flex size-10 items-center justify-center rounded-full bg-accent text-accent-ink"
        >
          <svg viewBox="0 0 24 24" className="ml-0.5 size-4 fill-current">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </div>
      <h3 className="mt-4 font-display text-3xl transition-colors group-hover:text-accent">
        {video.title}
      </h3>
    </Link>
  );
}
