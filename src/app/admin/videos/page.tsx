import type { Metadata } from "next";
import { Suspense } from "react";
import {
  AdminHeader,
  AdminTable,
  shortDate,
  StatusBadge,
} from "@/components/admin/admin-ui";
import { Container } from "@/components/ui/container";
import { VIDEO_PROVIDERS } from "@/lib/video";
import { listVideosForAdmin } from "@/modules/videos/admin-queries";

export const metadata: Metadata = { title: "Videos" };

export default function AdminVideosPage() {
  return (
    <Container className="py-12">
      <AdminHeader
        title="Videos"
        action={{ href: "/admin/videos/new", label: "Add video" }}
      />
      <Suspense fallback={<p className="mt-10 text-muted">Loading…</p>}>
        <VideoTable />
      </Suspense>
    </Container>
  );
}

async function VideoTable() {
  const videos = await listVideosForAdmin();
  return (
    <AdminTable
      columns={["Video", "Status", "Source", "Updated"]}
      empty="No videos yet."
      rows={videos.map((video) => ({
        key: video.id,
        href: `/admin/videos/${video.id}`,
        cells: [
          <>
            {video.title}
            {video.featured ? (
              <span className="ml-2 text-xs text-accent">★ Featured</span>
            ) : null}
          </>,
          <StatusBadge key="status" status={video.status} />,
          VIDEO_PROVIDERS[video.provider],
          shortDate(video.updated_at),
        ],
      }))}
    />
  );
}
