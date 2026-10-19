import "server-only";
import { requireRole, STAFF_ROLES } from "@/lib/auth/dal";
import { toImage } from "@/lib/media";
import { createClient } from "@/lib/supabase/server";
import { eventOptions } from "@/modules/events/admin-queries";
import { MEDIA_COLUMNS } from "@/modules/media/server";

export async function listVideosForAdmin() {
  await requireRole(STAFF_ROLES, "/admin/videos");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("videos")
    .select("id, title, status, featured, provider, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`Failed to load videos: ${error.message}`);
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
