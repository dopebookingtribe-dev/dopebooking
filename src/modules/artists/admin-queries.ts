import "server-only";
import { requireRole, STAFF_ROLES } from "@/lib/auth/dal";
import { toImage } from "@/lib/media";
import { isMissingSchema } from "@/lib/supabase/schema-errors";
import { createClient } from "@/lib/supabase/server";
import { listLibraryFiles } from "@/modules/media/library-server";

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

/**
 * Availability, press kit and everywhere the artist appears, for the editor.
 * Empty (with `enabled: false`) before migration 20261122000100.
 */
export async function getArtistExtras(id: string) {
  const supabase = await createClient();
  const [availability, kit, lineups, videos, releases, posts, art, documents] =
    await Promise.all([
      supabase
        .from("artist_availability")
        .select("id, starts_on, ends_on, status, location, note, is_public")
        .eq("artist_id", id)
        .order("starts_on"),
      supabase
        .from("artists")
        .select("press_kit_asset_id")
        .eq("id", id)
        .maybeSingle(),
      supabase.from("event_artists").select("event_id").eq("artist_id", id),
      supabase
        .from("videos")
        .select("id, title, status")
        .eq("artist_id", id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("music_releases")
        .select("id, title, status")
        .eq("artist_id", id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("posts")
        .select("id, title, status")
        .eq("artist_id", id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("art_artists")
        .select("id, name, status")
        .eq("music_artist_id", id),
      listLibraryFiles(["document"]),
    ]);
  const eventIds = (lineups.data ?? []).map((row) => row.event_id);
  const { data: events } = eventIds.length
    ? await supabase
        .from("events")
        .select("id, title, starts_at, status")
        .in("id", eventIds)
        .order("starts_at", { ascending: false })
    : { data: [] };
  const enabled = !isMissingSchema(availability.error);
  return {
    enabled,
    availability: enabled ? (availability.data ?? []) : [],
    pressKitId: enabled ? (kit.data?.press_kit_asset_id ?? null) : null,
    documents: documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      url: doc.url,
    })),
    appearsIn: {
      events: (events ?? []).map((e) => ({
        href: `/admin/events/${e.id}`,
        label: `${e.title} (${e.starts_at.slice(0, 10)})`,
        status: e.status,
      })),
      videos: (videos.data ?? []).map((v) => ({
        href: `/admin/videos/${v.id}`,
        label: v.title,
        status: v.status,
      })),
      releases: (releases.data ?? []).map((r) => ({
        href: `/admin/music/${r.id}`,
        label: r.title,
        status: r.status,
      })),
      posts: isMissingSchema(posts.error)
        ? []
        : (posts.data ?? []).map((p) => ({
            href: `/admin/posts/${p.id}`,
            label: p.title,
            status: p.status,
          })),
      art: isMissingSchema(art.error)
        ? []
        : (art.data ?? []).map((a) => ({
            href: `/admin/art/artists/${a.id}`,
            label: a.name,
            status: a.status,
          })),
    },
  };
}
