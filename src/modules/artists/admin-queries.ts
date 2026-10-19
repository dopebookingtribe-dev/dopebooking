import "server-only";
import { requireRole, STAFF_ROLES } from "@/lib/auth/dal";
import { toImage } from "@/lib/media";
import { createClient } from "@/lib/supabase/server";

// Staff-only reads through the user's session, so RLS applies as well.

export async function listArtistsForAdmin() {
  await requireRole(STAFF_ROLES, "/admin/artists");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("artists")
    .select("id, slug, stage_name, status, featured, genres, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`Failed to load artists: ${error.message}`);
  return data;
}

export async function getArtistForAdmin(id: string) {
  await requireRole(STAFF_ROLES, `/admin/artists/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

  const supabase = await createClient();
  const [artist, privateInfo, links, media] = await Promise.all([
    supabase.from("artists").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("artist_private")
      .select("*")
      .eq("artist_id", id)
      .maybeSingle(),
    supabase
      .from("artist_links")
      .select("id, platform, url, sort_order")
      .eq("artist_id", id)
      .order("sort_order"),
    supabase
      .from("media_assets")
      .select(
        "id, storage_bucket, storage_path, alt_text, credit, width, height, sort_order",
      )
      .eq("artist_id", id)
      .order("sort_order")
      .order("created_at"),
  ]);

  for (const result of [artist, privateInfo, links, media]) {
    if (result.error) {
      throw new Error(`Failed to load artist: ${result.error.message}`);
    }
  }
  if (!artist.data) return null;

  return {
    artist: artist.data,
    privateInfo: privateInfo.data,
    links: links.data ?? [],
    images: (media.data ?? []).map(toImage),
  };
}

export type AdminArtist = NonNullable<
  Awaited<ReturnType<typeof getArtistForAdmin>>
>;
