import "server-only";
import { requirePermission } from "@/lib/auth/permissions";
import { toImage } from "@/lib/media";
import { createClient } from "@/lib/supabase/server";
import { MEDIA_COLUMNS } from "@/modules/media/server";

// Admin reads through the editor's session, so RLS applies as well.

const isUuid = (value: string) => /^[0-9a-f-]{36}$/i.test(value);

type Result<T> = { data: T | null; error: { message: string } | null };

/** Rows of a list query; throws on error. */
function must<T>(result: Result<T[]>, what: string): T[] {
  if (result.error)
    throw new Error(`Failed to load ${what}: ${result.error.message}`);
  return result.data ?? [];
}

/** One row or null; throws on error. */
function maybe<T>(result: Result<T>, what: string): T | null {
  if (result.error)
    throw new Error(`Failed to load ${what}: ${result.error.message}`);
  return result.data;
}

/** True when the Art Gallery tables exist (the migration has been applied). */
export async function artTablesReady() {
  const supabase = await createClient();
  const { error } = await supabase.from("art_artists").select("id").limit(1);
  return !error;
}

export async function getArtOverview() {
  await requirePermission("content.manage", "/admin/art");
  const supabase = await createClient();
  const [artists, exhibitions, works, festivals, inquiries] = await Promise.all(
    [
      supabase.from("art_artists").select("status"),
      supabase.from("art_exhibitions").select("status"),
      supabase.from("art_artworks").select("status"),
      supabase
        .from("art_festivals")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("service_requests")
        .select("id, reference, event_name, status, created_at")
        .eq("service_type", "art_gallery")
        .order("created_at", { ascending: false })
        .limit(5),
    ],
  );
  if (artists.error) return null;
  const tally = (rows: { status: string }[] | null) => ({
    total: rows?.length ?? 0,
    published: rows?.filter((row) => row.status === "published").length ?? 0,
    draft: rows?.filter((row) => row.status === "draft").length ?? 0,
  });
  return {
    artists: tally(artists.data),
    exhibitions: tally(exhibitions.data),
    works: tally(works.data),
    festivals: festivals.count ?? 0,
    inquiries: inquiries.data ?? [],
  };
}

// ---------------------------------------------------------------------------
// Option lists for pickers
// ---------------------------------------------------------------------------

async function artistOptions() {
  const supabase = await createClient();
  return must(
    await supabase
      .from("art_artists")
      .select("id, name, kind, status")
      .order("name"),
    "artists",
  );
}

async function videoOptions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("videos")
    .select("id, title, status, art_artist_id, art_exhibition_id")
    .order("title");
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Artists
// ---------------------------------------------------------------------------

export async function listArtArtistsForAdmin() {
  await requirePermission("content.manage", "/admin/art/artists");
  const supabase = await createClient();
  return must(
    await supabase
      .from("art_artists")
      .select(
        "id, slug, name, kind, status, featured, sort_order, disciplines, is_demo, updated_at",
      )
      .order("updated_at", { ascending: false }),
    "artists",
  );
}

export async function getArtArtistForAdmin(id: string) {
  await requirePermission("content.manage", `/admin/art/artists/${id}`);
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const [artist, links, media, members, memberOf, shows, credits] =
    await Promise.all([
      supabase.from("art_artists").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("art_artist_links")
        .select("id, platform, url, sort_order")
        .eq("art_artist_id", id)
        .order("sort_order"),
      supabase
        .from("media_assets")
        .select(MEDIA_COLUMNS)
        .eq("art_artist_id", id)
        .order("sort_order")
        .order("created_at"),
      supabase
        .from("art_collective_members")
        .select("member_id, note, sort_order")
        .eq("collective_id", id)
        .order("sort_order"),
      supabase
        .from("art_collective_members")
        .select("collective_id")
        .eq("member_id", id),
      supabase
        .from("art_exhibition_artists")
        .select("exhibition_id, roles")
        .eq("art_artist_id", id),
      supabase
        .from("art_artwork_credits")
        .select("artwork_id")
        .eq("art_artist_id", id),
    ]);
  const row = maybe(artist, "artist");
  if (!row) return null;

  const exhibitionIds = must(shows, "exhibitions").map((s) => s.exhibition_id);
  const workIds = must(credits, "credits").map((c) => c.artwork_id);
  const [exhibitions, works, artists, musicArtists, videos] = await Promise.all(
    [
      exhibitionIds.length
        ? supabase
            .from("art_exhibitions")
            .select("id, title, status")
            .in("id", exhibitionIds)
        : { data: [], error: null },
      workIds.length
        ? supabase
            .from("art_artworks")
            .select("id, title, status")
            .in("id", workIds)
        : { data: [], error: null },
      artistOptions(),
      supabase.from("artists").select("id, stage_name").order("stage_name"),
      videoOptions(),
    ],
  );

  return {
    artist: row,
    links: must(links, "links"),
    images: must(media, "images").map(toImage),
    members: must(members, "members"),
    memberOf: must(memberOf, "collectives").map((m) => m.collective_id),
    exhibitions: (exhibitions.data ?? []).map((e) => ({
      ...e,
      roles:
        must(shows, "exhibitions").find((s) => s.exhibition_id === e.id)
          ?.roles ?? [],
    })),
    works: works.data ?? [],
    artistOptions: artists,
    musicArtists: musicArtists.data ?? [],
    videos,
  };
}

// ---------------------------------------------------------------------------
// Exhibitions
// ---------------------------------------------------------------------------

export async function listArtExhibitionsForAdmin() {
  await requirePermission("content.manage", "/admin/art/exhibitions");
  const supabase = await createClient();
  return must(
    await supabase
      .from("art_exhibitions")
      .select(
        "id, slug, title, status, featured, sort_order, starts_on, ends_on, city, country, festival_id, is_demo, updated_at",
      )
      .order("starts_on", { ascending: false, nullsFirst: true }),
    "exhibitions",
  );
}

export async function getArtExhibitionForAdmin(id: string) {
  await requirePermission("content.manage", `/admin/art/exhibitions/${id}`);
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const [exhibition, lineup, shown, media, partners, festivals, events, works] =
    await Promise.all([
      supabase.from("art_exhibitions").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("art_exhibition_artists")
        .select("art_artist_id, roles, note, sort_order")
        .eq("exhibition_id", id)
        .order("sort_order"),
      supabase
        .from("art_exhibition_artworks")
        .select("artwork_id, sort_order")
        .eq("exhibition_id", id)
        .order("sort_order"),
      supabase
        .from("media_assets")
        .select(`${MEDIA_COLUMNS}, art_collection`)
        .eq("art_exhibition_id", id)
        .order("sort_order")
        .order("created_at"),
      supabase
        .from("art_exhibition_partners")
        .select("id, name, kind, url, logo_asset_id, sort_order")
        .eq("exhibition_id", id)
        .order("sort_order"),
      supabase.from("art_festivals").select("id, name").order("name"),
      supabase
        .from("events")
        .select("id, title, starts_at")
        .order("starts_at", { ascending: false })
        .limit(200),
      supabase
        .from("art_artworks")
        .select("id, title, status, year")
        .order("title"),
    ]);
  const row = maybe(exhibition, "exhibition");
  if (!row) return null;
  const [artists, videos] = await Promise.all([
    artistOptions(),
    videoOptions(),
  ]);
  return {
    exhibition: row,
    lineup: must(lineup, "line-up"),
    artworkIds: must(shown, "artworks").map((s) => s.artwork_id),
    images: must(media, "images").map((asset) => ({
      ...toImage(asset),
      collection: asset.art_collection,
    })),
    partners: must(partners, "partners"),
    festivals: must(festivals, "festivals"),
    events: must(events, "events"),
    workOptions: must(works, "artworks"),
    artistOptions: artists,
    videos,
  };
}

// ---------------------------------------------------------------------------
// Artworks
// ---------------------------------------------------------------------------

export async function listArtworksForAdmin() {
  await requirePermission("content.manage", "/admin/art/artworks");
  const supabase = await createClient();
  const [works, credits, artists] = await Promise.all([
    supabase
      .from("art_artworks")
      .select(
        "id, slug, title, year, discipline, status, featured, sort_order, image_asset_id, is_demo, updated_at",
      )
      .order("updated_at", { ascending: false }),
    supabase
      .from("art_artwork_credits")
      .select("artwork_id, art_artist_id, sort_order")
      .order("sort_order"),
    supabase.from("art_artists").select("id, name"),
  ]);
  const names = new Map(
    (must(artists, "artists") ?? []).map((a) => [a.id, a.name]),
  );
  const byWork = new Map<string, string[]>();
  for (const credit of must(credits, "credits")) {
    byWork.set(credit.artwork_id, [
      ...(byWork.get(credit.artwork_id) ?? []),
      names.get(credit.art_artist_id) ?? "?",
    ]);
  }
  return must(works, "artworks").map((work) => ({
    ...work,
    artists: byWork.get(work.id) ?? [],
  }));
}

export async function getArtworkForAdmin(id: string) {
  await requirePermission("content.manage", `/admin/art/artworks/${id}`);
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const [work, credits, shown, media, exhibitions] = await Promise.all([
    supabase.from("art_artworks").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("art_artwork_credits")
      .select("art_artist_id, credit, sort_order")
      .eq("artwork_id", id)
      .order("sort_order"),
    supabase
      .from("art_exhibition_artworks")
      .select("exhibition_id")
      .eq("artwork_id", id),
    supabase
      .from("media_assets")
      .select(MEDIA_COLUMNS)
      .eq("art_artwork_id", id)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("art_exhibitions")
      .select("id, title, starts_on, status")
      .order("starts_on", { ascending: false, nullsFirst: true }),
  ]);
  const row = maybe(work, "artwork");
  if (!row) return null;
  return {
    work: row,
    credits: must(credits, "credits"),
    exhibitionIds: must(shown, "exhibitions").map((s) => s.exhibition_id),
    images: must(media, "images").map(toImage),
    exhibitionOptions: must(exhibitions, "exhibitions"),
    artistOptions: await artistOptions(),
  };
}

// ---------------------------------------------------------------------------
// Festivals, ordering and inquiries
// ---------------------------------------------------------------------------

export async function listFestivalsForAdmin() {
  await requirePermission("content.manage", "/admin/art/festivals");
  const supabase = await createClient();
  const [festivals, exhibitions] = await Promise.all([
    supabase
      .from("art_festivals")
      .select("*")
      .order("sort_order")
      .order("name"),
    supabase.from("art_exhibitions").select("festival_id"),
  ]);
  const counts = new Map<string, number>();
  for (const row of must(exhibitions, "exhibitions")) {
    if (row.festival_id)
      counts.set(row.festival_id, (counts.get(row.festival_id) ?? 0) + 1);
  }
  return must(festivals, "festivals").map((festival) => ({
    ...festival,
    exhibitions: counts.get(festival.id) ?? 0,
  }));
}

export async function getFestivalForAdmin(id: string) {
  await requirePermission("content.manage", `/admin/art/festivals/${id}`);
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("art_festivals")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load festival: ${error.message}`);
  return data;
}

/** Featured artists and exhibitions, in the order the public pages show them. */
export async function getFeaturedOrder() {
  await requirePermission("content.manage", "/admin/art/order");
  const supabase = await createClient();
  const [artists, exhibitions, works] = await Promise.all([
    supabase
      .from("art_artists")
      .select("id, name, status, sort_order")
      .eq("featured", true)
      .neq("status", "archived")
      .order("sort_order")
      .order("name"),
    supabase
      .from("art_exhibitions")
      .select("id, title, status, sort_order")
      .eq("featured", true)
      .neq("status", "archived")
      .order("sort_order")
      .order("starts_on", { ascending: false }),
    supabase
      .from("art_artworks")
      .select("id, title, status, sort_order")
      .eq("featured", true)
      .neq("status", "archived")
      .order("sort_order")
      .order("title"),
  ]);
  return {
    artists: must(artists, "artists").map((a) => ({
      id: a.id,
      label: a.name,
      status: a.status,
    })),
    exhibitions: must(exhibitions, "exhibitions").map((e) => ({
      id: e.id,
      label: e.title,
      status: e.status,
    })),
    works: must(works, "artworks").map((w) => ({
      id: w.id,
      label: w.title,
      status: w.status,
    })),
  };
}

export async function listArtInquiries() {
  await requirePermission("content.manage", "/admin/art/inquiries");
  const supabase = await createClient();
  return must(
    await supabase
      .from("service_requests")
      .select(
        "id, reference, event_name, organisation, city, country, event_start, status, details, created_at",
      )
      .eq("service_type", "art_gallery")
      .order("created_at", { ascending: false })
      .limit(200),
    "inquiries",
  );
}
