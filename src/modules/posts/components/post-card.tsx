import Image from "next/image";
import Link from "next/link";
import { DemoBadge } from "@/components/ui/demo-badge";
import { CONTAINERS } from "@/modules/media/image-specs";
import type { PostCard as PostCardData } from "../queries";

export function formatPostDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Berlin",
  });
}

export function PostCard({
  post,
  large = false,
  priority = false,
  showDemo = true,
}: {
  post: PostCardData;
  large?: boolean;
  priority?: boolean;
  showDemo?: boolean;
}) {
  return (
    <Link href={`/news/${post.slug}`} className="group flex h-full flex-col">
      <div
        className={`relative overflow-hidden rounded-(--radius) bg-surface-2 ${large ? CONTAINERS.newsLead : CONTAINERS.newsCard}`}
      >
        {post.cover ? (
          <Image
            src={post.cover.url}
            alt=""
            fill
            priority={priority}
            sizes={
              large
                ? "(min-width: 1024px) 60vw, 92vw"
                : "(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
            }
            style={{ objectPosition: post.cover.position }}
            className="object-cover transition-transform duration-700 ease-(--ease-out) group-hover:scale-[1.03]"
          />
        ) : (
          <span
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,color-mix(in_oklab,var(--uv)_35%,transparent),transparent_60%),radial-gradient(circle_at_70%_70%,color-mix(in_oklab,var(--accent)_30%,transparent),transparent_55%)]"
          />
        )}
        {post.isDemo && showDemo ? (
          <DemoBadge className="absolute top-3 left-3" />
        ) : null}
      </div>
      <p className="mt-4 font-label text-sm text-muted">
        {post.category ? (
          <span className="text-accent">{post.category} · </span>
        ) : null}
        <time dateTime={post.publishedAt}>
          {formatPostDate(post.publishedAt)}
        </time>{" "}
        · {post.readingMinutes} min read
      </p>
      <h3
        className={`mt-2 font-display transition-colors group-hover:text-accent ${large ? "text-4xl sm:text-5xl" : "text-3xl"}`}
      >
        {post.title}
      </h3>
      {post.excerpt ? (
        <p className="mt-3 line-clamp-3 text-muted">{post.excerpt}</p>
      ) : null}
    </Link>
  );
}
