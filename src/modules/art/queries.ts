import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import { cacheLife, cacheTag } from "next/cache";
import { toImage, type Image } from "@/lib/media";
import type {
  ArtArtistKind,
  ArtCollection,
  ArtLinkPlatform,
  ArtPartnerKind,
} from "@/lib/supabase/database.types";
import { createPublicClient } from "@/lib/supabase/public";
import { MEDIA_COLUMNS } from "@/modules/media/server";
import { sortExhibitions } from "./relations";
import {
  exhibitionTiming,
  formatDimensions,
  isRole,
  ROLE_KEYS,
  todayIso,
  type Role,
  type Timing,
} from "./schemas";

/*
 * Public reads for the Art Gallery. The whole published catalogue (artists,
 * exhibitions, works and how they connect) is small, so it loads in one
 * cached pass; relationships such as "who worked with whom" are derived
 * from it rather than stored. Detail pages add their own photo sets.
 * Everything is cached until an admin edit refreshes the "art" tag.
 */

export const ART_TAG = "art";
export { sortExhibitions } from "./relations";

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

export type ArtArtistCard = {
  id: string;
  slug: string;
  name: string;
  stageName: string | null;
  kind: ArtArtistKind;
  tagline: string | null;
  disciplines: string[];
  country: string | null;
  basedIn: string | null;
  featured: boolean;
  isDemo: boolean;
  portrait: Image | null;
  updatedAt: string;
};

export type ArtFestival = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  websiteUrl: string | null;
  description: string | null;
};

export type ArtExhibitionCard = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  festival: ArtFestival | null;
  venueName: string | null;
  city: string | null;
  country: string | null;
  startsOn: string | null;
  endsOn: string | null;
  dateNote: string | null;
  timing: Timing;
  accent: string | null;
  featured: boolean;
  isDemo: boolean;
  cover: Image | null;
  mobileCover: Image | null;
  /** Published participants, in line-up order. */
  artistIds: string[];
  updatedAt: string;
};

export type ArtCredit = {
  artist: Pick<ArtArtistCard, "id" | "slug" | "name">;
  credit: string | null;
};

export type ArtworkCard = {
  id: string;
  slug: string;
  title: string;
  year: number | null;
  discipline: string | null;
  medium: string | null;
  dimensions: string | null;
  description: string | null;
  featured: boolean;
  isDemo: boolean;
  image: Image | null;
  credits: ArtCredit[];
  exhibitionIds: string[];
  updatedAt: string;
};

export type Participation = {
  exhibitionId: string;
  artistId: string;
  roles: Role[];
  note: string | null;
};

export type ArtCatalog = {
  artists: ArtArtistCard[];
  exhibitions: ArtExhibitionCard[];
  works: ArtworkCard[];
  festivals: ArtFestival[];
  participations: Participation[];
  /** collective id -> member ids */
  members: Record<string, string[]>;
  /** exhibition id -> artwork ids, in the exhibition's own order */
  collections: Record<string, string[]>;
  /** False until the Art Gallery migration is applied. */
  ready: boolean;
};

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

/** PostgREST/Postgres codes for "this table doesn't exist (yet)". */
function isMissingTable(error: PostgrestError | null) {
  return !!error && ["PGRST205", "42P01", "PGRST200"].includes(error.code);
}

const EMPTY: ArtCatalog = {
  artists: [],
  exhibitions: [],
  works: [],
  festivals: [],
  participations: [],
  members: {},
  collections: {},
  ready: false,
};

export async function getArtCatalog(): Promise<ArtCatalog> {
  "use cache";
  cacheLife("hours");
  cacheTag(ART_TAG);

  const supabase = createPublicClient();
  const [
    artists,
    exhibitions,
    works,
    festivals,
    lineup,
    credits,
    shown,
    members,
  ] = await Promise.all([
    supabase
      .from("art_artists")
      .select(
        "id, slug, name, stage_name, kind, tagline, disciplines, country, based_in, featured, is_demo, portrait_asset_id, updated_at",
      )
      .eq("status", "published")
      .order("featured", { ascending: false })
      .order("sort_order")
      .order("name"),
    supabase
      .from("art_exhibitions")
      .select(
        "id, slug, title, subtitle, summary, festival_id, venue_name, city, country, starts_on, ends_on, date_note, accent_color, featured, is_demo, cover_asset_id, mobile_cover_asset_id, sort_order, updated_at",
      )
      .eq("status", "published")
      .order("featured", { ascending: false })
      .order("sort_order")
      .order("starts_on", { ascending: false, nullsFirst: true }),
    supabase
      .from("art_artworks")
      .select(
        "id, slug, title, year, discipline, medium, width_cm, height_cm, depth_cm, dimensions_note, description, featured, is_demo, image_asset_id, updated_at",
      )
      .eq("status", "published")
      .order("featured", { ascending: false })
      .order("sort_order")
      .order("year", { ascending: false, nullsFirst: false }),
    supabase
      .from("art_festivals")
      .select("id, slug, name, city, country, website_url, description")
      .order("sort_order")
      .order("name"),
    supabase
      .from("art_exhibition_artists")
      .select("exhibition_id, art_artist_id, roles, note, sort_order")
      .order("sort_order"),
    supabase
      .from("art_artwork_credits")
      .select("artwork_id, art_artist_id, credit, sort_order")
      .order("sort_order"),
    supabase
      .from("art_exhibition_artworks")
      .select("exhibition_id, artwork_id, sort_order")
      .order("sort_order"),
    supabase
      .from("art_collective_members")
      .select("collective_id, member_id, sort_order")
      .order("sort_order"),
  ]);

  const results = [
    artists,
    exhibitions,
    works,
    festivals,
    lineup,
    credits,
    shown,
    members,
  ];
  if (results.some((result) => isMissingTable(result.error))) return EMPTY;
  for (const result of results) {
    if (result.error) {
      throw new Error(
        `Failed to load the Art Gallery: ${result.error.message}`,
      );
    }
  }

  const imageIds = [
    ...artists.data!.map((row) => row.portrait_asset_id),
    ...exhibitions.data!.flatMap((row) => [
      row.cover_asset_id,
      row.mobile_cover_asset_id,
    ]),
    ...works.data!.map((row) => row.image_asset_id),
  ].filter((id): id is string => !!id);
  const images = new Map<string, Image>();
  for (let i = 0; i < imageIds.length; i += 150) {
    const { data, error } = await supabase
      .from("media_assets")
      .select(MEDIA_COLUMNS)
      .in("id", imageIds.slice(i, i + 150));
    if (error) throw new Error(`Failed to load art images: ${error.message}`);
    for (const row of data) images.set(row.id, toImage(row));
  }
  const image = (id: string | null) => (id ? (images.get(id) ?? null) : null);

  const artistCards: ArtArtistCard[] = artists.data!.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    stageName: row.stage_name,
    kind: row.kind,
    tagline: row.tagline,
    disciplines: row.disciplines,
    country: row.country,
    basedIn: row.based_in,
    featured: row.featured,
    isDemo: row.is_demo,
    portrait: image(row.portrait_asset_id),
    updatedAt: row.updated_at,
  }));
  const artistById = new Map(artistCards.map((artist) => [artist.id, artist]));

  const festivalList: ArtFestival[] = festivals.data!.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    city: row.city,
    country: row.country,
    websiteUrl: row.website_url,
    description: row.description,
  }));
  const festivalById = new Map(festivalList.map((f) => [f.id, f]));

  const participations: Participation[] = lineup.data!.flatMap((row) =>
    artistById.has(row.art_artist_id)
      ? [
          {
            exhibitionId: row.exhibition_id,
            artistId: row.art_artist_id,
            roles: ROLE_KEYS.filter((role) => row.roles.includes(role)).filter(
              isRole,
            ),
            note: row.note,
          },
        ]
      : [],
  );

  const today = todayIso();
  const exhibitionCards = sortExhibitions(
    exhibitions.data!.map((row): ArtExhibitionCard => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      subtitle: row.subtitle,
      summary: row.summary,
      festival: row.festival_id
        ? (festivalById.get(row.festival_id) ?? null)
        : null,
      venueName: row.venue_name,
      city: row.city,
      country: row.country,
      startsOn: row.starts_on,
      endsOn: row.ends_on,
      dateNote: row.date_note,
      timing: exhibitionTiming(row.starts_on, row.ends_on, today),
      accent: row.accent_color,
      featured: row.featured,
      isDemo: row.is_demo,
      cover: image(row.cover_asset_id),
      mobileCover: image(row.mobile_cover_asset_id),
      artistIds: participations
        .filter((p) => p.exhibitionId === row.id)
        .map((p) => p.artistId),
      updatedAt: row.updated_at,
    })),
  );

  const creditsByWork = new Map<string, ArtCredit[]>();
  for (const row of credits.data!) {
    const artist = artistById.get(row.art_artist_id);
    if (!artist) continue;
    const list = creditsByWork.get(row.artwork_id) ?? [];
    list.push({
      artist: { id: artist.id, slug: artist.slug, name: artist.name },
      credit: row.credit,
    });
    creditsByWork.set(row.artwork_id, list);
  }
  const shownByWork = new Map<string, string[]>();
  const collectionMap: Record<string, string[]> = {};
  for (const row of shown.data!) {
    collectionMap[row.exhibition_id] = [
      ...(collectionMap[row.exhibition_id] ?? []),
      row.artwork_id,
    ];
    shownByWork.set(row.artwork_id, [
      ...(shownByWork.get(row.artwork_id) ?? []),
      row.exhibition_id,
    ]);
  }

  const workCards: ArtworkCard[] = works.data!.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    year: row.year,
    discipline: row.discipline,
    medium: row.medium,
    dimensions: formatDimensions(row),
    description: row.description,
    featured: row.featured,
    isDemo: row.is_demo,
    image: image(row.image_asset_id),
    credits: creditsByWork.get(row.id) ?? [],
    exhibitionIds: shownByWork.get(row.id) ?? [],
    updatedAt: row.updated_at,
  }));

  const memberMap: Record<string, string[]> = {};
  for (const row of members.data!) {
    if (!artistById.has(row.member_id)) continue;
    memberMap[row.collective_id] = [
      ...(memberMap[row.collective_id] ?? []),
      row.member_id,
    ];
  }

  // Only festivals with a published exhibition are readable anyway.
  return {
    artists: artistCards,
    exhibitions: exhibitionCards,
    works: workCards,
    festivals: festivalList,
    participations,
    members: memberMap,
    collections: collectionMap,
    ready: true,
  };
}

// Derived relationships live in ./relations (pure, unit-tested).
export {
  collaborationWeight,
  collaborations,
  type Collaboration,
} from "./relations";

// ---------------------------------------------------------------------------
// Detail pages
// ---------------------------------------------------------------------------

export type ArtArtistProfile = ArtArtistCard & {
  specialization: string | null;
  bio: string | null;
  statement: string | null;
  techniques: string | null;
  websiteUrl: string | null;
  inquiriesEnabled: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  cover: Image | null;
  musicArtist: { slug: string; stageName: string } | null;
  links: { platform: ArtLinkPlatform; url: string }[];
  /** Other photos of the artist (studio, process). */
  images: Image[];
};

export async function getArtArtist(
  slug: string,
): Promise<ArtArtistProfile | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(ART_TAG, "artists");

  const supabase = createPublicClient();
  const { data: row, error } = await supabase
    .from("art_artists")
    .select(
      "id, slug, name, stage_name, kind, tagline, disciplines, specialization, country, based_in, bio, statement, techniques, website_url, inquiries_enabled, music_artist_id, featured, is_demo, seo_title, seo_description, portrait_asset_id, cover_asset_id, updated_at",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (isMissingTable(error)) return null;
  if (error) throw new Error(`Failed to load artist: ${error.message}`);
  if (!row) return null;

  const [links, media, music] = await Promise.all([
    supabase
      .from("art_artist_links")
      .select("platform, url")
      .eq("art_artist_id", row.id)
      .order("sort_order"),
    supabase
      .from("media_assets")
      .select(MEDIA_COLUMNS)
      .eq("art_artist_id", row.id)
      .order("sort_order")
      .order("created_at"),
    row.music_artist_id
      ? supabase
          .from("artists")
          .select("slug, stage_name")
          .eq("id", row.music_artist_id)
          .maybeSingle()
      : null,
  ]);
  if (links.error)
    throw new Error(`Failed to load links: ${links.error.message}`);
  if (media.error)
    throw new Error(`Failed to load images: ${media.error.message}`);

  const images = media.data.map(toImage);
  const portrait =
    images.find((image) => image.id === row.portrait_asset_id) ?? null;
  const cover = images.find((image) => image.id === row.cover_asset_id) ?? null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    stageName: row.stage_name,
    kind: row.kind,
    tagline: row.tagline,
    disciplines: row.disciplines,
    specialization: row.specialization,
    country: row.country,
    basedIn: row.based_in,
    bio: row.bio,
    statement: row.statement,
    techniques: row.techniques,
    websiteUrl: row.website_url,
    inquiriesEnabled: row.inquiries_enabled,
    featured: row.featured,
    isDemo: row.is_demo,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    portrait,
    cover,
    // RLS hides unpublished roster artists.
    musicArtist: music?.data
      ? { slug: music.data.slug, stageName: music.data.stage_name }
      : null,
    links: links.data,
    images: images.filter(
      (image) => image.id !== portrait?.id && image.id !== cover?.id,
    ),
    updatedAt: row.updated_at,
  };
}

export type ArtPhoto = Image & { collection: ArtCollection | null };

export type ArtExhibitionDetail = {
  id: string;
  overview: string | null;
  concept: string | null;
  externalUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  event: { slug: string; title: string } | null;
  photos: ArtPhoto[];
  partners: {
    id: string;
    name: string;
    kind: ArtPartnerKind;
    url: string | null;
    logo: Image | null;
  }[];
};

/** The parts of an exhibition the catalogue card doesn't carry. */
export async function getArtExhibitionDetail(
  slug: string,
): Promise<ArtExhibitionDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(ART_TAG, "events");

  const supabase = createPublicClient();
  const { data: row, error } = await supabase
    .from("art_exhibitions")
    .select(
      "id, overview, concept, external_url, seo_title, seo_description, event_id, cover_asset_id, mobile_cover_asset_id",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (isMissingTable(error)) return null;
  if (error) throw new Error(`Failed to load exhibition: ${error.message}`);
  if (!row) return null;

  const [media, partners, event] = await Promise.all([
    supabase
      .from("media_assets")
      .select(`${MEDIA_COLUMNS}, art_collection`)
      .eq("art_exhibition_id", row.id)
      .order("sort_order")
      .order("created_at"),
    supabase
      .from("art_exhibition_partners")
      .select("id, name, kind, url, logo_asset_id")
      .eq("exhibition_id", row.id)
      .order("sort_order"),
    row.event_id
      ? supabase
          .from("events")
          .select("slug, title")
          .eq("id", row.event_id)
          .maybeSingle()
      : null,
  ]);
  if (media.error)
    throw new Error(`Failed to load photos: ${media.error.message}`);
  if (partners.error) {
    throw new Error(`Failed to load partners: ${partners.error.message}`);
  }

  const all = media.data.map((asset) => ({
    ...toImage(asset),
    collection: asset.art_collection,
  }));
  const byId = new Map(all.map((photo) => [photo.id, photo]));
  const hidden = new Set([row.cover_asset_id, row.mobile_cover_asset_id]);
  return {
    id: row.id,
    overview: row.overview,
    concept: row.concept,
    externalUrl: row.external_url,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    event: event?.data ?? null,
    photos: all.filter(
      (photo) => photo.collection !== "logo" && !hidden.has(photo.id),
    ),
    partners: partners.data.map((partner) => ({
      id: partner.id,
      name: partner.name,
      kind: partner.kind,
      url: partner.url,
      logo: partner.logo_asset_id
        ? (byId.get(partner.logo_asset_id) ?? null)
        : null,
    })),
  };
}

/** Detail and process images of one artwork, lead image first. */
export async function getArtworkImages(artworkId: string): Promise<Image[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(ART_TAG);

  const { data, error } = await createPublicClient()
    .from("media_assets")
    .select(MEDIA_COLUMNS)
    .eq("art_artwork_id", artworkId)
    .order("sort_order")
    .order("created_at");
  if (error) throw new Error(`Failed to load artwork images: ${error.message}`);
  return data.map(toImage);
}

/** Photos across exhibitions for the Gallery highlights section. */
export async function getArtHighlights(
  limit = 36,
): Promise<(ArtPhoto & { exhibition: { slug: string; title: string } })[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(ART_TAG);

  const catalog = await getArtCatalog();
  if (!catalog.ready || !catalog.exhibitions.length) return [];
  const byId = new Map(catalog.exhibitions.map((e) => [e.id, e]));
  const { data, error } = await createPublicClient()
    .from("media_assets")
    .select(`${MEDIA_COLUMNS}, art_collection, art_exhibition_id`)
    .in("art_exhibition_id", [...byId.keys()])
    .not("art_collection", "is", null)
    .neq("art_collection", "logo")
    .order("sort_order")
    .limit(Math.min(limit * 6, 400));
  if (isMissingTable(error)) return [];
  if (error) throw new Error(`Failed to load highlights: ${error.message}`);
  // Mix exhibitions and sets: take one photo from each group in turn.
  const groups = new Map<string, typeof data>();
  for (const asset of data) {
    const key = `${asset.art_exhibition_id}|${asset.art_collection}`;
    groups.set(key, [...(groups.get(key) ?? []), asset]);
  }
  const mixed: typeof data = [];
  const queues = [...groups.values()];
  while (mixed.length < limit && queues.some((queue) => queue.length)) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next && mixed.length < limit) mixed.push(next);
    }
  }
  return mixed.flatMap((asset) => {
    const exhibition = asset.art_exhibition_id
      ? byId.get(asset.art_exhibition_id)
      : undefined;
    return exhibition
      ? [
          {
            ...toImage(asset),
            collection: asset.art_collection,
            exhibition: { slug: exhibition.slug, title: exhibition.title },
          },
        ]
      : [];
  });
}
