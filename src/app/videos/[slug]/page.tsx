import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { VideoCard } from "@/modules/videos/components/video-card";
import { VideoPlayer } from "@/modules/videos/components/video-player";
import {
  getPublishedVideo,
  getPublishedVideos,
} from "@/modules/videos/queries";

type Props = PageProps<"/videos/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const video = await getPublishedVideo(slug);
  if (!video) return { title: "Video not found" };
  return {
    title: video.title,
    description: video.description?.slice(0, 155) ?? video.title,
    alternates: { canonical: `/videos/${video.slug}` },
    openGraph: {
      title: `${video.title} · DopeBooking`,
      type: "video.other",
      images: video.poster ? [{ url: video.poster.url }] : undefined,
    },
  };
}

export default function VideoPage({ params }: Props) {
  return (
    <Container className="py-16">
      <Link
        href="/videos"
        className="text-sm text-muted transition-colors hover:text-text"
      >
        ← All videos
      </Link>
      <Suspense
        fallback={
          <div className="mt-8 aspect-video animate-pulse rounded-(--radius) bg-surface-1" />
        }
      >
        <Video params={params} />
      </Suspense>
    </Container>
  );
}

async function Video({ params }: { params: Props["params"] }) {
  const { slug } = await params;
  const video = await getPublishedVideo(slug);
  if (!video) notFound();
  const more = (await getPublishedVideos())
    .filter((other) => other.id !== video.id)
    .slice(0, 4);

  return (
    <>
      <div className="mt-8">
        <VideoPlayer
          source={{ provider: video.provider, ref: video.ref }}
          title={video.title}
          poster={video.poster}
          priority
        />
      </div>
      <h1 className="mt-10 max-w-5xl font-display text-headline">
        {video.title}
      </h1>
      {video.event || video.artist ? (
        <p className="mt-4 text-muted">
          {video.artist ? (
            <>
              <Link
                href={`/artists/${video.artist.slug}`}
                className="text-text underline underline-offset-4"
              >
                {video.artist.stageName}
              </Link>
              {video.event ? " · " : ""}
            </>
          ) : null}
          {video.event ? (
            <Link
              href={`/events/${video.event.slug}`}
              className="text-text underline underline-offset-4"
            >
              {video.event.title}
            </Link>
          ) : null}
        </p>
      ) : null}
      {video.description ? (
        <p className="mt-6 max-w-prose text-lg leading-relaxed text-muted">
          {video.description}
        </p>
      ) : null}

      {more.length ? (
        <section aria-labelledby="more-heading" className="mt-24">
          <h2 id="more-heading">
            <Meta>More videos</Meta>
          </h2>
          <ul className="mt-6 grid gap-x-6 gap-y-12 sm:grid-cols-2">
            {more.map((other) => (
              <li key={other.id}>
                <VideoCard video={other} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
