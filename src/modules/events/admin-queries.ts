import "server-only";
import { requireRole, STAFF_ROLES } from "@/lib/auth/dal";
import { toImage } from "@/lib/media";
import { createClient } from "@/lib/supabase/server";
import { MEDIA_COLUMNS } from "@/modules/media/server";

const UUID = /^[0-9a-f-]{36}$/i;

export async function listEventsForAdmin() {
  await requireRole(STAFF_ROLES, "/admin/events");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, title, status, featured, starts_at, timezone, city, country")
    .order("starts_at", { ascending: false });
  if (error) throw new Error(`Failed to load events: ${error.message}`);
  return data;
}

/** Minimal list for "link to event" dropdowns. */
export async function eventOptions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, title, starts_at")
    .order("starts_at", { ascending: false });
  if (error) throw new Error(`Failed to load events: ${error.message}`);
  return data;
}

export async function getEventForAdmin(id: string) {
  await requireRole(STAFF_ROLES, `/admin/events/${id}`);
  if (!UUID.test(id)) return null;

  const supabase = await createClient();
  const [event, lineup, media, artists] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("event_artists")
      .select("artist_id, stage, set_starts_at, sort_order")
      .eq("event_id", id)
      .order("sort_order"),
    supabase
      .from("media_assets")
      .select(MEDIA_COLUMNS)
      .eq("event_id", id)
      .order("sort_order"),
    supabase
      .from("artists")
      .select("id, stage_name, status")
      .neq("status", "archived")
      .order("stage_name"),
  ]);
  for (const result of [event, lineup, media, artists]) {
    if (result.error) {
      throw new Error(`Failed to load event: ${result.error.message}`);
    }
  }
  if (!event.data) return null;

  return {
    event: event.data,
    lineup: lineup.data ?? [],
    images: (media.data ?? []).map(toImage),
    artistOptions: artists.data ?? [],
  };
}
