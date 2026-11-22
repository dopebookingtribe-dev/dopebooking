import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { requirePermission } from "@/lib/auth/permissions";
import { createVideo } from "@/modules/videos/actions";
import { getVideoFileOptions } from "@/modules/videos/admin-queries";
import { CreateVideoForm } from "@/modules/videos/components/admin/create-video-form";

export const metadata: Metadata = { title: "Add video" };

export default function NewVideoPage() {
  return (
    <Container className="py-12">
      <AdminHeader
        title="Add video"
        backHref="/admin/videos"
        backLabel="All videos"
      />
      <p className="mt-4 max-w-2xl text-muted">
        Paste a link, or upload the file itself (MP4, WebM or MOV up to 50 MB).
        Uploaded videos are stored in the media library and play in the
        site&apos;s own player.
      </p>
      <div className="mt-10">
        <Suspense fallback={<p className="text-muted">Checking access…</p>}>
          <Gate />
        </Suspense>
      </div>
    </Container>
  );
}

async function Gate() {
  await requirePermission("content.manage", "/admin/videos/new");
  const { files, filesEnabled } = await getVideoFileOptions();
  return (
    <CreateVideoForm
      action={createVideo}
      files={files}
      filesEnabled={filesEnabled}
    />
  );
}
