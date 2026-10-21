import { MediaTabs } from "@/components/site/media-tabs";
import { Container } from "@/components/ui/container";
import { getPublishedVideos } from "../queries";
import { VideoCard } from "./video-card";

export async function VideoIndex() {
  const videos = await getPublishedVideos();
  return (
    <Container className="py-12 sm:py-16">
      <MediaTabs active="videos" />
      {videos.length ? (
        <ul className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2">
          {videos.map((video, index) => (
            <li key={video.id}>
              <VideoCard video={video} priority={index < 2} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-10 text-lg text-muted">Aftermovies are in the edit.</p>
      )}
    </Container>
  );
}
