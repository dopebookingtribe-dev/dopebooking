import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { getSiteSettings } from "@/modules/cms/queries";
import { PostArticle } from "@/modules/posts/components/post-article";
import { getPublishedPost, getPublishedPosts } from "@/modules/posts/queries";

type Props = PageProps<"/news/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return { title: "Post not found" };
  const description = post.seoDescription ?? post.excerpt ?? undefined;
  return {
    title: post.seoTitle ?? post.title,
    description,
    alternates: { canonical: `/news/${post.slug}` },
    openGraph: {
      title: `${post.seoTitle ?? post.title} | DopeBooking`,
      description,
      type: "article",
      publishedTime: post.publishedAt,
      images: post.cover ? [{ url: post.cover.url }] : undefined,
    },
  };
}

export default function NewsPostPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <Container className="py-16">
          <div className="h-12 w-2/3 animate-pulse rounded-(--radius) bg-surface-1" />
        </Container>
      }
    >
      <Post params={params} />
    </Suspense>
  );
}

async function Post({ params }: { params: Props["params"] }) {
  const { slug } = await params;
  const [post, settings] = await Promise.all([
    getPublishedPost(slug),
    getSiteSettings(),
  ]);
  if (!post) notFound();
  const more = (await getPublishedPosts({ limit: 4 }))
    .filter((item) => item.id !== post.id)
    .slice(0, 3);
  return (
    <PostArticle post={post} more={more} showDemo={settings.showDemoLabels} />
  );
}
