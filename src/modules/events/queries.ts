import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Image } from "@/lib/media";
import type { Database } from "@/lib/supabase/database.types";
import { createPublicClient } from "@/lib/supabase/public";
import { fetchImagesById } from "@/modules/media/queries";

export const EVENTS_TAG = "events";

export type EventCard = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  startsAt: string;
  endsAt: string | null;
  timezone: string;
  venueName: string | null;
  city: string | null;
  country: string | null;
  featured: boolean;
  isDemo: boolean;
  cover: Image | null;
  /** Portrait cover for phones; falls back to `cover` when null. */
  mobileCover: Image | null;
  updatedAt: string;
};

export type LineupEntry = {
  slug: string;
  stageName: string;
  portrait: Image | null;
  stage: string | null;
  setStartsAt: string | null;
};

export type EventDetail = EventCard & {
  /** Whether it had ended when the cache entry was filled. */
  isPast: boolean;
  description: string | null;
  ticketUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  lineup: LineupEntry[];
};

const CARD_COLUMNS =
  "id, slug, title, summary, starts_at, ends_at, timezone, venue_name, city, country, featured, is_demo, cover_asset_id, updated_at";

type CardRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  venue_name: string | null;
  city: string | null;
  country: string | null;
  featured: boolean;
  is_demo: boolean;
  cover_asset_id: string | null;
  updated_at: string;
};

function toCard(
  row: CardRow,
  covers: Map<string, Image>,
  mobileCoverIds: Map<string, string> = new Map(),
): EventCard {
  const mobileId = mobileCoverIds.get(row.id);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    timezone: row.timezone,
    venueName: row.venue_name,
    city: row.city,
    country: row.country,
    featured: row.featured,
    isDemo: row.is_demo,
    cover: row.cover_asset_id ? (covers.get(row.cover_asset_id) ?? null) : null,
    mobileCover: mobileId ? (covers.get(mobileId) ?? null) : null,
    updatedAt: row.updated_at,
  };
}

/**
 * Phone covers by event id. Read on their own so event pages keep working
 * on a database without migration 20261115000000 (the column is missing
 * there, and events simply have no phone cover).
 */
async function fetchMobileCoverIds(
  supabase: SupabaseClient<Database>,
  eventIds: string[],
): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  if (!eventIds.length) return ids;
  const { data, error } = await supabase
    .from("events")
    .select("id, mobile_cover_asset_id")
    .in("id", eventIds);
  if (error) return ids;
  for (const row of data) {
    if (row.mobile_cover_asset_id) ids.set(row.id, row.mobile_cover_asset_id);
  }
  return ids;
}

/**
 * Published events split into upcoming (soonest first) and past (latest
 * first). The split uses the time the cache entry was filled, so an event
 * may stay "upcoming" for up to an hour after it ends.
 */
export async function getPublishedEvents(): Promise<{
  upcoming: EventCard[];
  past: EventCard[];
}> {
  "use cache";
  cacheLife("hours");
  cacheTag(EVENTS_TAG);

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("events")
    .select(CARD_COLUMNS)
    .eq("status", "published")
    .order("starts_at");
  if (error) throw new Error(`Failed to load events: ${error.message}`);

  const mobileCoverIds = await fetchMobileCoverIds(
    supabase,
    data.map((row) => row.id),
  );
  const covers = await fetchImagesById(supabase, [
    ...data.map((row) => row.cover_asset_id),
    ...mobileCoverIds.values(),
  ]);
  const now = new Date().toISOString();
  const cards = data.map((row) => toCard(row, covers, mobileCoverIds));
  return {
    upcoming: cards.filter((event) => (event.endsAt ?? event.startsAt) >= now),
    past: cards
      .filter((event) => (event.endsAt ?? event.startsAt) < now)
      .reverse(),
  };
}

export async function getPublishedEvent(
  slug: string,
): Promise<EventDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(EVENTS_TAG, "artists");

  const supabase = createPublicClient();
  const { data: event, error } = await supabase
    .from("events")
    .select(
      `${CARD_COLUMNS}, description, ticket_url, seo_title, seo_description`,
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error(`Failed to load event: ${error.message}`);
  if (!event) return null;

  // RLS only returns lineup rows whose artist is published.
  const { data: lineupRows, error: lineupError } = await supabase
    .from("event_artists")
    .select("artist_id, stage, set_starts_at, sort_order")
    .eq("event_id", event.id)
    .order("sort_order");
  if (lineupError) {
    throw new Error(`Failed to load lineup: ${lineupError.message}`);
  }

  const artistIds = lineupRows.map((row) => row.artist_id);
  const { data: artists, error: artistsError } = artistIds.length
    ? await supabase
        .from("artists")
        .select("id, slug, stage_name, portrait_asset_id")
        .in("id", artistIds)
    : { data: [], error: null };
  if (artistsError) {
    throw new Error(`Failed to load lineup: ${artistsError.message}`);
  }

  const mobileCoverIds = await fetchMobileCoverIds(supabase, [event.id]);
  const images = await fetchImagesById(supabase, [
    event.cover_asset_id,
    ...mobileCoverIds.values(),
    ...artists.map((artist) => artist.portrait_asset_id),
  ]);
  const byId = new Map(artists.map((artist) => [artist.id, artist]));

  return {
    ...toCard(event, images, mobileCoverIds),
    isPast: (event.ends_at ?? event.starts_at) < new Date().toISOString(),
    description: event.description,
    ticketUrl: event.ticket_url,
    seoTitle: event.seo_title,
    seoDescription: event.seo_description,
    lineup: lineupRows.flatMap((row) => {
      const artist = byId.get(row.artist_id);
      if (!artist) return [];
      return [
        {
          slug: artist.slug,
          stageName: artist.stage_name,
          portrait: artist.portrait_asset_id
            ? (images.get(artist.portrait_asset_id) ?? null)
            : null,
          stage: row.stage,
          setStartsAt: row.set_starts_at,
        },
      ];
    }),
  };
}

/** Upcoming published events an artist plays, for their profile. */
export async function getUpcomingEventsForArtist(
  artistId: string,
): Promise<EventCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(EVENTS_TAG);

  const supabase = createPublicClient();
  const { data: rows, error } = await supabase
    .from("event_artists")
    .select("event_id")
    .eq("artist_id", artistId);
  if (error) throw new Error(`Failed to load shows: ${error.message}`);
  if (!rows.length) return [];

  const now = new Date().toISOString();
  const { data, error: eventsError } = await supabase
    .from("events")
    .select(CARD_COLUMNS)
    .eq("status", "published")
    .in(
      "id",
      rows.map((row) => row.event_id),
    )
    .or(`ends_at.gte."${now}",and(ends_at.is.null,starts_at.gte."${now}")`)
    .order("starts_at");
  if (eventsError) {
    throw new Error(`Failed to load shows: ${eventsError.message}`);
  }
  return data.map((row) => toCard(row, new Map()));
}
