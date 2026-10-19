import type { Metadata } from "next";
import { Suspense } from "react";
import { MediaTabs } from "@/components/site/media-tabs";
import { Container } from "@/components/ui/container";
import { Meta } from "@/components/ui/meta";
import { VideoCard } from "@/modules/videos/components/video-card";
import { getPublishedVideos } from "@/modules/videos/queries";

export const metadata: Metadata = {
  title: "Videos",
  description: "Aftermovies, live sets and artist videos.",
  alternates: { canonical: "/videos" },
};

export default function VideosPage() {
  return (
    <Container className="py-16 sm:py-24">
      <Meta>Media</Meta>
      <h1 className="mt-4 font-display text-display">Videos</h1>
      <MediaTabs active="videos" />
      <Suspense fallback={<p className="mt-16 text-muted">Loading videos…</p>}>
        <Videos />
      </Suspense>
    </Container>
  );
}

async function Videos() {
  const videos = await getPublishedVideos();
  if (!videos.length) {
    return <p className="mt-16 text-muted">Aftermovies are in the edit.</p>;
  }
  return (
    <ul className="mt-12 grid gap-x-6 gap-y-12 sm:grid-cols-2">
      {videos.map((video, index) => (
        <li key={video.id}>
          <VideoCard video={video} priority={index < 2} />
        </li>
      ))}
    </ul>
  );
}
