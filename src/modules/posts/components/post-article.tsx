import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { DemoBadge } from "@/components/ui/demo-badge";
import { CONTAINERS } from "@/modules/media/image-specs";
import type { PostCard as PostCardData, PostDetail } from "../queries";
import { PostBody } from "./post-body";
import { formatPostDate, PostCard } from "./post-card";

/** The article layout, shared by /news/[slug] and the admin preview. */
export function PostArticle({
  post,
  more = [],
  showDemo = true,
}: {
  post: PostDetail;
  more?: PostCardData[];
  showDemo?: boolean;
}) {
  return (
    <Container className="py-12 sm:py-16">
      <Link
        href="/news"
        className="text-sm text-muted transition-colors hover:text-text"
      >
        ← All news
      </Link>
      <header className="mt-8 max-w-4xl">
        <p className="font-label text-sm text-muted">
          {post.category ? (
            <span className="text-accent">{post.category} · </span>
          ) : null}
          <time dateTime={post.publishedAt}>
            {formatPostDate(post.publishedAt)}
          </time>{" "}
          · {post.readingMinutes} min read
          {post.authorName ? ` · ${post.authorName}` : ""}
        </p>
        <h1 className="mt-4 font-display text-headline">{post.title}</h1>
        {post.excerpt ? (
          <p className="mt-6 text-xl text-muted">{post.excerpt}</p>
        ) : null}
        {post.isDemo && showDemo ? <DemoBadge className="mt-4" /> : null}
      </header>
      {post.cover ? (
        <div
          className={`relative mt-10 ${CONTAINERS.newsLead} overflow-hidden rounded-(--radius) bg-surface-2`}
        >
          <Image
            src={post.cover.url}
            alt={post.cover.alt}
            fill
            priority
            sizes="(min-width: 1280px) 74rem, 92vw"
            style={{ objectPosition: post.cover.position }}
            className="object-cover"
          />
        </div>
      ) : null}
      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <article>
          <PostBody blocks={post.blocks} embeds={post.embeds} />
        </article>
        {post.artist || post.event || post.tags.length ? (
          <aside className="flex flex-col gap-6 text-sm lg:border-l lg:border-line lg:pl-8">
            {post.artist ? (
              <div>
                <p className="font-label text-xs text-muted">Artist</p>
                <Link
                  href={`/artists/${post.artist.slug}`}
                  className="mt-1 block text-lg underline-offset-4 hover:text-accent hover:underline"
                >
                  {post.artist.stageName}
                </Link>
              </div>
            ) : null}
            {post.event ? (
              <div>
                <p className="font-label text-xs text-muted">Event</p>
                <Link
                  href={`/events/${post.event.slug}`}
                  className="mt-1 block text-lg underline-offset-4 hover:text-accent hover:underline"
                >
                  {post.event.title}
                </Link>
              </div>
            ) : null}
            {post.tags.length ? (
              <div>
                <p className="font-label text-xs text-muted">Tags</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full border border-line-strong px-2.5 py-0.5 text-xs text-muted"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>
      {more.length ? (
        <section
          aria-labelledby="more-news"
          className="mt-24 border-t border-line pt-12"
        >
          <h2 id="more-news" className="font-display text-4xl">
            More news
          </h2>
          <ul className="mt-8 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((item) => (
              <li key={item.id}>
                <PostCard post={item} showDemo={showDemo} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Container>
  );
}
