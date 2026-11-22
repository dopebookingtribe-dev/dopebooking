import "server-only";
import { requireRole, STAFF_ROLES } from "@/lib/auth/dal";
import { toImage } from "@/lib/media";
import { isMissingSchema } from "@/lib/supabase/schema-errors";
import { createClient } from "@/lib/supabase/server";
import { eventOptions } from "@/modules/events/admin-queries";
import {
  cmsUpgradeApplied,
  listLibraryFiles,
} from "@/modules/media/library-server";
import { MEDIA_COLUMNS } from "@/modules/media/server";

/** Library video files for the source picker, and whether uploads work yet. */
export async function getVideoFileOptions() {
  const enabled = await cmsUpgradeApplied();
  const files = enabled ? await listLibraryFiles(["video"]) : [];
  return {
    filesEnabled: enabled,
    files: files.map((file) => ({
      id: file.id,
      title: file.title,
      sizeBytes: file.sizeBytes,
      durationSeconds: file.durationSeconds,
      url: file.url,
      mimeType: file.mimeType,
    })),
  };
}

export async function listVideosForAdmin() {
  await requireRole(STAFF_ROLES, "/admin/videos");
  const supabase = await createClient();
  type Row = {
    id: string;
    title: string;
    status: "draft" | "published" | "archived";
    featured: boolean;
    provider: import("@/lib/supabase/database.types").VideoProvider;
    updated_at: string;
    sort_order?: number;
  };
  const run = (columns: string, ordered: boolean) => {
    let query = supabase
      .from("videos")
      .select(columns)
      .order("featured", { ascending: false });
    if (ordered) query = query.order("sort_order");
    return query
      .order("updated_at", { ascending: false })
      .overrideTypes<Row[], { merge: false }>();
  };
  let { data, error } = await run(
    "id, title, status, featured, provider, updated_at, sort_order",
    true,
  );
  if (isMissingSchema(error)) {
    ({ data, error } = await run(
      "id, title, status, featured, provider, updated_at",
      false,
    ));
  }
  if (error || !data)
    throw new Error(`Failed to load videos: ${error?.message}`);
  return data;
}

export async function getVideoForAdmin(id: string) {
  await requireRole(STAFF_ROLES, `/admin/videos/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

  const supabase = await createClient();
  const [video, media, events, artists] = await Promise.all([
    supabase.from("videos").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("media_assets")
      .select(MEDIA_COLUMNS)
      .eq("video_id", id)
      .order("sort_order"),
    eventOptions(),
    supabase
      .from("artists")
      .select("id, stage_name")
      .neq("status", "archived")
      .order("stage_name"),
  ]);
  if (video.error || media.error || artists.error) {
    throw new Error("Failed to load video.");
  }
  if (!video.data) return null;

  return {
    video: video.data,
    images: (media.data ?? []).map(toImage),
    eventOptions: events,
    artistOptions: artists.data ?? [],
  };
}
