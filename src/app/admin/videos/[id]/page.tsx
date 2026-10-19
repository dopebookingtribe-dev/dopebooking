import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  AdminHeader,
  EditSection,
  StatusBadge,
} from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { ImageGrid } from "@/modules/media/components/image-grid";
import { ImageUploader } from "@/modules/media/components/image-uploader";
import { mediaFolder } from "@/modules/media/server";
import {
  deleteVideoImage,
  registerVideoPoster,
  setVideoPoster,
  updateVideoDetails,
} from "@/modules/videos/actions";
import { getVideoForAdmin } from "@/modules/videos/admin-queries";
import { VideoDetailsForm } from "@/modules/videos/components/admin/video-details-form";
import { VideoPlayer } from "@/modules/videos/components/video-player";

export const metadata: Metadata = { title: "Edit video" };

export default function EditVideoPage({
  params,
}: PageProps<"/admin/videos/[id]">) {
  return (
    <Container className="py-12">
      <Suspense fallback={<p className="text-muted">Loading video…</p>}>
        <Editor params={params} />
      </Suspense>
    </Container>
  );
}

async function Editor({
  params,
}: {
  params: PageProps<"/admin/videos/[id]">["params"];
}) {
  const { id } = await params;
  const data = await getVideoForAdmin(id);
  if (!data) notFound();
  const { video, images, eventOptions, artistOptions } = data;

  return (
    <>
      <AdminHeader
        title={video.title}
        eyebrow="Edit video"
        backHref="/admin/videos"
        backLabel="All videos"
      >
        <StatusBadge status={video.status} />
        {video.status === "published" ? (
          <Link
            href={`/videos/${video.slug}`}
            className="text-sm underline underline-offset-4"
          >
            View public page
          </Link>
        ) : null}
      </AdminHeader>
      <div className="mt-12 flex flex-col gap-16">
        <EditSection
          title="Preview"
          description="How the player looks on the site."
        >
          <VideoPlayer
            source={{ provider: video.provider, ref: video.provider_ref }}
            title={video.title}
            poster={
              images.find((image) => image.id === video.poster_asset_id) ?? null
            }
          />
        </EditSection>
        <EditSection
          title="Details"
          description="Public once the video is published."
        >
          <VideoDetailsForm
            video={video}
            eventOptions={eventOptions}
            artistOptions={artistOptions}
            action={updateVideoDetails.bind(null, video.id)}
          />
        </EditSection>
        <EditSection
          title="Poster image"
          description="Optional. Shown before the video plays. Vimeo videos need one; other sources use their own thumbnail."
        >
          <div className="flex flex-col gap-8">
            <ImageGrid
              images={images}
              leadId={video.poster_asset_id}
              leadLabel="Poster"
              makeLead={setVideoPoster.bind(null, video.id)}
              remove={deleteVideoImage.bind(null, video.id)}
            />
            <ImageUploader
              folder={mediaFolder("video", video.id)}
              register={registerVideoPoster.bind(null, video.id)}
            />
          </div>
        </EditSection>
      </div>
    </>
  );
}
