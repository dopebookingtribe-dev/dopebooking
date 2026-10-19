import "server-only";
import { requireRole, STAFF_ROLES } from "@/lib/auth/dal";
import { toImage } from "@/lib/media";
import { createClient } from "@/lib/supabase/server";
import { eventOptions } from "@/modules/events/admin-queries";
import { MEDIA_COLUMNS } from "@/modules/media/server";

export async function listGalleriesForAdmin() {
  await requireRole(STAFF_ROLES, "/admin/galleries");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("galleries")
    .select("id, title, status, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`Failed to load galleries: ${error.message}`);
  return data;
}

export async function getGalleryForAdmin(id: string) {
  await requireRole(STAFF_ROLES, `/admin/galleries/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

  const supabase = await createClient();
  const [gallery, media, events] = await Promise.all([
    supabase.from("galleries").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("media_assets")
      .select(MEDIA_COLUMNS)
      .eq("gallery_id", id)
      .order("sort_order")
      .order("created_at"),
    eventOptions(),
  ]);
  if (gallery.error || media.error) {
    throw new Error("Failed to load gallery.");
  }
  if (!gallery.data) return null;

  return {
    gallery: gallery.data,
    images: (media.data ?? []).map(toImage),
    eventOptions: events,
  };
}
