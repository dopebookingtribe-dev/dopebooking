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
import { GUIDELINES_PATH } from "@/modules/media/image-specs";
import { mediaFolder } from "@/modules/media/server";
import { DeleteRecordForm } from "@/components/admin/delete-record-form";
import {
  deleteVideo,
  deleteVideoImage,
  registerVideoPoster,
  setVideoPoster,
  updateVideoDetails,
} from "@/modules/videos/actions";
import {
  getVideoFileOptions,
  getVideoForAdmin,
} from "@/modules/videos/admin-queries";
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
  const [data, fileOptions] = await Promise.all([
    getVideoForAdmin(id),
    getVideoFileOptions(),
  ]);
  if (!data) notFound();
  const { video, images, eventOptions, artistOptions } = data;
  const file = fileOptions.files.find((f) => f.id === video.file_asset_id);

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
            source={{
              provider: video.provider,
              ref: video.provider_ref,
              fileUrl: file?.url ?? null,
              mimeType: file?.mimeType ?? null,
            }}
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
            files={fileOptions.files}
            filesEnabled={fileOptions.filesEnabled}
            action={updateVideoDetails.bind(null, video.id)}
          />
        </EditSection>
        <EditSection
          title="Poster image"
          description="Shown before the video plays. Uploaded files and Vimeo videos need one; other links use their own thumbnail. 1920 × 1080 (16:9)."
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
              guidelinesHref={GUIDELINES_PATH}
              roles={[
                {
                  spec: "video-poster",
                  label: "Poster",
                  assign: setVideoPoster.bind(null, video.id),
                },
              ]}
            />
          </div>
        </EditSection>
        <EditSection
          title="Delete"
          description="Removes the video and its poster images for good. Archive it instead to keep it."
        >
          <DeleteRecordForm
            label="Delete video"
            confirm={`Delete “${video.title}”? This can't be undone.`}
            action={deleteVideo.bind(null, video.id)}
          >
            {video.provider === "file" ? (
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  name="delete_file"
                  className="size-4 accent-(--accent)"
                />
                Also delete the uploaded video file from the media library (kept
                if anything else uses it)
              </label>
            ) : null}
          </DeleteRecordForm>
        </EditSection>
      </div>
    </>
  );
}
