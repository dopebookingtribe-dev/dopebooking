import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { publicObjectUrl, toImage, type Image } from "@/lib/media";
import type {
  ArtistBalance,
  MusicFileFormat,
  MusicReleaseStatus,
  MusicReleaseType,
} from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { fetchImagesById } from "@/modules/media/queries";
import { MEDIA_COLUMNS } from "@/modules/media/server";

export const MUSIC_TAG = "music";
const PREVIEW_BUCKET = "music-previews";

export type Genre = {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
};

export type ReleaseCard = {
  id: string;
  slug: string;
  title: string;
  type: MusicReleaseType;
  artist: { id: string; slug: string; name: string };
  cover: Image | null;
  price: number | null;
  currency: string;
  genre: Genre | null;
  subgenre: Genre | null;
  bpm: number | null;
  musicalKey: string | null;
  releaseDate: string | null;
  publishedAt: string | null;
  featured: boolean;
  onSale: boolean;
  formats: MusicFileFormat[];
  trackCount: number;
  /** First track's preview, for play buttons on cards. */
  firstPreview: PreviewTrack | null;
};

export type PreviewTrack = {
  id: string;
  title: string;
  previewUrl: string;
  duration: number | null;
  releaseTitle: string;
  releaseHref: string;
  artistName: string;
  cover: string | null;
};

export type ReleaseTrack = {
  id: string;
  position: number;
  title: string;
  duration: number | null;
  bpm: number | null;
  musicalKey: string | null;
  previewUrl: string | null;
};

export type ReleaseDetail = ReleaseCard & {
  label: string | null;
  catalogNumber: string | null;
  description: string | null;
  credits: string | null;
  tracks: ReleaseTrack[];
  bundleItems: ReleaseCard[];
};

export const releaseHref = (release: {
  slug: string;
  artist: { slug: string };
}) => `/music/${release.artist.slug}/${release.slug}`;

// ---------------------------------------------------------------------------
// Public catalogue (cached; the anonymous client only sees live releases)
// ---------------------------------------------------------------------------

export async function getMusicGenres(): Promise<Genre[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(MUSIC_TAG);
  const { data } = await createPublicClient()
    .from("music_genres")
    .select("id, slug, name, parent_id, sort_order")
    .order("sort_order")
    .order("name");
  return (data ?? []).map((genre) => ({
    id: genre.id,
    slug: genre.slug,
    name: genre.name,
    parentId: genre.parent_id,
  }));
}

const RELEASE_COLUMNS =
  "id, slug, title, release_type, artist_id, cover_asset_id, price_amount, currency, genre_id, subgenre_id, bpm, musical_key, release_date, published_at, featured, sort_order, on_sale, formats, label, catalog_number, description, credits";

type ReleaseRow = {
  id: string;
  slug: string;
  title: string;
  release_type: MusicReleaseType;
  artist_id: string;
  cover_asset_id: string | null;
  price_amount: number | null;
  currency: string;
  genre_id: string | null;
  subgenre_id: string | null;
  bpm: number | null;
  musical_key: string | null;
  release_date: string | null;
  published_at: string | null;
  featured: boolean;
  sort_order: number;
  on_sale: boolean;
  formats: MusicFileFormat[];
};

type TrackRow = {
  id: string;
  release_id: string;
  position: number;
  title: string;
  duration_seconds: number | null;
  bpm: number | null;
  musical_key: string | null;
  preview_path: string | null;
};

/**
 * Every live release with its artist, cover, genre and track previews.
 * Catalogues are small enough to filter in memory; one cache entry
 * serves the storefront, search and artist pages.
 */
export async function getPublishedReleases(): Promise<{
  releases: ReleaseCard[];
  tracks: Record<string, ReleaseTrack[]>;
  details: Record<
    string,
    Pick<ReleaseDetail, "label" | "catalogNumber" | "description" | "credits">
  >;
  bundles: Record<string, string[]>;
}> {
  "use cache";
  cacheLife("hours");
  cacheTag(MUSIC_TAG, "artists");

  const supabase = createPublicClient();
  const { data: rows, error } = await supabase
    .from("music_releases")
    .select(RELEASE_COLUMNS)
    .eq("status", "published")
    .order("featured", { ascending: false })
    .order("sort_order")
    .order("published_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error(`Failed to load music: ${error.message}`);
  if (!rows.length)
    return { releases: [], tracks: {}, details: {}, bundles: {} };

  const ids = rows.map((row) => row.id);
  const [artists, covers, trackRows, bundleRows, genres] = await Promise.all([
    supabase
      .from("artists")
      .select("id, slug, stage_name")
      .in("id", [...new Set(rows.map((row) => row.artist_id))]),
    fetchImagesById(
      supabase,
      rows.map((row) => row.cover_asset_id),
    ),
    supabase
      .from("music_tracks")
      .select(
        "id, release_id, position, title, duration_seconds, bpm, musical_key, preview_path",
      )
      .in("release_id", ids)
      .order("position"),
    supabase
      .from("music_bundle_items")
      .select("bundle_id, release_id, sort_order")
      .in("bundle_id", ids)
      .order("sort_order"),
    getMusicGenres(),
  ]);

  const artistById = new Map(
    (artists.data ?? []).map((artist) => [artist.id, artist]),
  );
  const genreById = new Map(genres.map((genre) => [genre.id, genre]));
  const tracks: Record<string, ReleaseTrack[]> = {};
  for (const track of (trackRows.data ?? []) as TrackRow[]) {
    (tracks[track.release_id] ??= []).push({
      id: track.id,
      position: track.position,
      title: track.title,
      duration: track.duration_seconds,
      bpm: track.bpm,
      musicalKey: track.musical_key,
      previewUrl: track.preview_path
        ? publicObjectUrl(PREVIEW_BUCKET, track.preview_path)
        : null,
    });
  }
  const bundles: Record<string, string[]> = {};
  for (const item of bundleRows.data ?? []) {
    (bundles[item.bundle_id] ??= []).push(item.release_id);
  }

  const releases: ReleaseCard[] = [];
  const details: Record<
    string,
    Pick<ReleaseDetail, "label" | "catalogNumber" | "description" | "credits">
  > = {};
  for (const row of rows as (ReleaseRow & {
    label: string | null;
    catalog_number: string | null;
    description: string | null;
    credits: string | null;
  })[]) {
    const artist = artistById.get(row.artist_id);
    if (!artist) continue;
    const cover = row.cover_asset_id
      ? (covers.get(row.cover_asset_id) ?? null)
      : null;
    const href = `/music/${artist.slug}/${row.slug}`;
    const own = tracks[row.id] ?? [];
    const firstWithPreview =
      own.find((track) => track.previewUrl) ??
      (bundles[row.id] ?? [])
        .flatMap((id) => tracks[id] ?? [])
        .find((track) => track.previewUrl);
    releases.push({
      id: row.id,
      slug: row.slug,
      title: row.title,
      type: row.release_type,
      artist: { id: artist.id, slug: artist.slug, name: artist.stage_name },
      cover,
      price: row.price_amount,
      currency: row.currency,
      genre: row.genre_id ? (genreById.get(row.genre_id) ?? null) : null,
      subgenre: row.subgenre_id
        ? (genreById.get(row.subgenre_id) ?? null)
        : null,
      bpm: row.bpm,
      musicalKey: row.musical_key,
      releaseDate: row.release_date,
      publishedAt: row.published_at,
      featured: row.featured,
      onSale: row.on_sale,
      formats: row.formats ?? [],
      trackCount:
        row.release_type === "bundle"
          ? (bundles[row.id] ?? []).reduce(
              (sum, id) => sum + (tracks[id]?.length ?? 0),
              0,
            )
          : own.length,
      firstPreview: firstWithPreview?.previewUrl
        ? {
            id: firstWithPreview.id,
            title: firstWithPreview.title,
            previewUrl: firstWithPreview.previewUrl,
            duration: firstWithPreview.duration,
            releaseTitle: row.title,
            releaseHref: href,
            artistName: artist.stage_name,
            cover: cover?.url ?? null,
          }
        : null,
    });
    details[row.id] = {
      label: row.label,
      catalogNumber: row.catalog_number,
      description: row.description,
      credits: row.credits,
    };
  }
  return { releases, tracks, details, bundles };
}

export async function getTopSellingIds(limit = 8): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(MUSIC_TAG);
  const { data } = await createPublicClient().rpc("music_top_selling", {
    p_limit: limit,
  });
  return (data ?? []) as string[];
}

export async function getRelease(
  artistSlug: string,
  releaseSlug: string,
): Promise<ReleaseDetail | null> {
  const { releases, tracks, details, bundles } = await getPublishedReleases();
  const release = releases.find(
    (item) => item.artist.slug === artistSlug && item.slug === releaseSlug,
  );
  if (!release) return null;
  const byId = new Map(releases.map((item) => [item.id, item]));
  return {
    ...release,
    ...details[release.id],
    tracks: tracks[release.id] ?? [],
    bundleItems: (bundles[release.id] ?? []).flatMap((id) => {
      const item = byId.get(id);
      return item ? [item] : [];
    }),
  };
}

// ---------------------------------------------------------------------------
// Artist dashboard (session client; RLS limits rows to the artist's team)
// ---------------------------------------------------------------------------

export type MyArtist = {
  id: string;
  slug: string;
  name: string;
  published: boolean;
};

export async function getMyArtists(userId: string): Promise<MyArtist[]> {
  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from("artist_members")
    .select("artist_id")
    .eq("user_id", userId);
  const ids = (memberships ?? []).map((row) => row.artist_id);
  if (!ids.length) return [];
  const { data } = await supabase
    .from("artists")
    .select("id, slug, stage_name, status")
    .in("id", ids)
    .order("stage_name");
  return (data ?? []).map((artist) => ({
    id: artist.id,
    slug: artist.slug,
    name: artist.stage_name,
    published: artist.status === "published",
  }));
}

export type MyRelease = {
  id: string;
  artistId: string;
  slug: string;
  title: string;
  type: MusicReleaseType;
  status: MusicReleaseStatus;
  price: number | null;
  cover: Image | null;
  updatedAt: string;
  reviewNote: string | null;
};

export async function listMyReleases(
  artistIds: string[],
): Promise<MyRelease[]> {
  if (!artistIds.length) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("music_releases")
    .select(
      "id, artist_id, slug, title, release_type, status, price_amount, cover_asset_id, updated_at, review_note",
    )
    .in("artist_id", artistIds)
    .order("updated_at", { ascending: false });
  const rows = data ?? [];
  const covers = await fetchImagesById(
    supabase,
    rows.map((row) => row.cover_asset_id),
  );
  return rows.map((row) => ({
    id: row.id,
    artistId: row.artist_id,
    slug: row.slug,
    title: row.title,
    type: row.release_type,
    status: row.status,
    price: row.price_amount,
    cover: row.cover_asset_id ? (covers.get(row.cover_asset_id) ?? null) : null,
    updatedAt: row.updated_at,
    reviewNote: row.review_note,
  }));
}

export async function getReleaseForEdit(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data: release } = await supabase
    .from("music_releases")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!release) return null;
  const [artist, tracks, cover, bundleItems, candidates] = await Promise.all([
    supabase
      .from("artists")
      .select("id, slug, stage_name, status")
      .eq("id", release.artist_id)
      .single(),
    supabase
      .from("music_tracks")
      .select("*")
      .eq("release_id", id)
      .order("position"),
    release.cover_asset_id
      ? supabase
          .from("media_assets")
          .select(MEDIA_COLUMNS)
          .eq("id", release.cover_asset_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("music_bundle_items")
      .select("release_id, sort_order")
      .eq("bundle_id", id)
      .order("sort_order"),
    release.release_type === "bundle"
      ? supabase
          .from("music_releases")
          .select("id, title, release_type, status")
          .eq("artist_id", release.artist_id)
          .neq("release_type", "bundle")
          .order("title")
      : Promise.resolve({ data: [] }),
  ]);
  const trackIds = (tracks.data ?? []).map((track) => track.id);
  const { data: files } = trackIds.length
    ? await supabase
        .from("music_track_files")
        .select("id, track_id, format, size_bytes, storage_path")
        .in("track_id", trackIds)
    : { data: [] };
  return {
    release,
    artist: artist.data,
    cover: cover.data ? toImage(cover.data) : null,
    tracks: (tracks.data ?? []).map((track) => ({
      ...track,
      previewUrl: track.preview_path
        ? publicObjectUrl(PREVIEW_BUCKET, track.preview_path)
        : null,
      files: (files ?? []).filter((file) => file.track_id === track.id),
    })),
    bundleItems: (bundleItems.data ?? []).map((item) => item.release_id),
    candidates: candidates.data ?? [],
  };
}

const EMPTY_BALANCE: ArtistBalance = {
  gross_sales: 0,
  commission: 0,
  net_earnings: 0,
  refunded: 0,
  pending: 0,
  available: 0,
  in_withdrawal: 0,
  withdrawn: 0,
  adjustments: 0,
};

export async function getArtistBalance(
  artistId: string,
): Promise<ArtistBalance> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("artist_balance", { p_artist: artistId });
  const row = (data ?? [])[0];
  if (!row) return EMPTY_BALANCE;
  // bigint sums arrive as strings or numbers depending on size.
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, Number(value)]),
  ) as ArtistBalance;
}

export async function getArtistEarnings(artistId: string) {
  const supabase = await createClient();
  const [ledger, withdrawals, payout, settings] = await Promise.all([
    supabase
      .from("artist_ledger")
      .select("*")
      .eq("artist_id", artistId)
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("artist_withdrawals")
      .select("*")
      .eq("artist_id", artistId)
      .order("requested_at", { ascending: false }),
    supabase
      .from("artist_payout_details")
      .select("*")
      .eq("artist_id", artistId)
      .maybeSingle(),
    supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "music")
      .maybeSingle(),
  ]);
  const saleItemIds = (ledger.data ?? [])
    .filter((entry) => entry.entry_type === "sale" && entry.order_item_id)
    .map((entry) => entry.order_item_id!);
  const { data: items } = saleItemIds.length
    ? await supabase
        .from("order_items")
        .select(
          "id, music_release_id, product_title, line_total, artist_amount",
        )
        .in("id", saleItemIds)
    : { data: [] };
  const byRelease = new Map<
    string,
    { title: string; count: number; gross: number; net: number }
  >();
  for (const item of items ?? []) {
    const key = item.music_release_id ?? item.id;
    const row = byRelease.get(key) ?? {
      title: item.product_title,
      count: 0,
      gross: 0,
      net: 0,
    };
    row.count += 1;
    row.gross += item.line_total;
    row.net += item.artist_amount ?? 0;
    byRelease.set(key, row);
  }
  const value = (settings.data?.value ?? {}) as Record<string, number>;
  return {
    ledger: ledger.data ?? [],
    withdrawals: withdrawals.data ?? [],
    payout: payout.data,
    sales: [...byRelease.values()].sort((a, b) => b.gross - a.gross),
    minWithdrawal: value.min_withdrawal ?? 2000,
    holdDays: value.hold_days ?? 14,
  };
}

// ---------------------------------------------------------------------------
// Buyer library (service role, always filtered to the verified buyer)
// ---------------------------------------------------------------------------

export type LibraryRelease = {
  entitlementId: string;
  releaseId: string;
  title: string;
  type: MusicReleaseType;
  artistName: string;
  cover: Image | null;
  purchasedAt: string;
  orderReference: string;
  downloads: number;
  tracks: {
    id: string;
    title: string;
    releaseTitle: string;
    files: { id: string; format: MusicFileFormat; sizeBytes: number }[];
  }[];
};

/** Releases a buyer owns: by account, or by one order with its private link. */
export async function getLibrary(
  owner: { userId: string } | { orderId: string },
): Promise<LibraryRelease[]> {
  const admin = createAdminClient();
  let query = admin
    .from("music_entitlements")
    .select("id, release_id, order_id, granted_at")
    .is("revoked_at", null)
    .order("granted_at", { ascending: false });
  query =
    "userId" in owner
      ? query.eq("buyer_id", owner.userId)
      : query.eq("order_id", owner.orderId);
  const { data: entitlements } = await query;
  if (!entitlements?.length) return [];

  const orderIds = [...new Set(entitlements.map((e) => e.order_id))];
  const { data: orders } = await admin
    .from("orders")
    .select("id, reference, status")
    .in("id", orderIds);
  const orderById = new Map((orders ?? []).map((order) => [order.id, order]));
  const valid = entitlements.filter((e) =>
    ["paid", "fulfilled", "partially_refunded"].includes(
      orderById.get(e.order_id)?.status ?? "",
    ),
  );
  if (!valid.length) return [];

  const releaseIds = [...new Set(valid.map((e) => e.release_id))];
  const { data: bundleItems } = await admin
    .from("music_bundle_items")
    .select("bundle_id, release_id, sort_order")
    .in("bundle_id", releaseIds)
    .order("sort_order");
  const allIds = [
    ...new Set([
      ...releaseIds,
      ...(bundleItems ?? []).map((b) => b.release_id),
    ]),
  ];
  const [{ data: releases }, { data: tracks }, { data: downloads }] =
    await Promise.all([
      admin
        .from("music_releases")
        .select("id, title, release_type, artist_id, cover_asset_id")
        .in("id", allIds),
      admin
        .from("music_tracks")
        .select("id, release_id, position, title")
        .in("release_id", allIds)
        .order("position"),
      admin
        .from("music_downloads")
        .select("entitlement_id")
        .in(
          "entitlement_id",
          valid.map((e) => e.id),
        ),
    ]);
  const trackIds = (tracks ?? []).map((track) => track.id);
  const [{ data: files }, { data: artists }, covers] = await Promise.all([
    trackIds.length
      ? admin
          .from("music_track_files")
          .select("id, track_id, format, size_bytes")
          .in("track_id", trackIds)
      : Promise.resolve({ data: [] }),
    admin
      .from("artists")
      .select("id, stage_name")
      .in("id", [...new Set((releases ?? []).map((r) => r.artist_id))]),
    fetchImagesById(
      admin,
      (releases ?? []).map((r) => r.cover_asset_id),
    ),
  ]);
  const releaseById = new Map((releases ?? []).map((r) => [r.id, r]));
  const artistName = new Map((artists ?? []).map((a) => [a.id, a.stage_name]));
  const downloadCount = new Map<string, number>();
  for (const row of downloads ?? []) {
    downloadCount.set(
      row.entitlement_id,
      (downloadCount.get(row.entitlement_id) ?? 0) + 1,
    );
  }
  const tracksOf = (releaseId: string) =>
    (tracks ?? [])
      .filter((track) => track.release_id === releaseId)
      .map((track) => ({
        id: track.id,
        title: track.title,
        releaseTitle: releaseById.get(releaseId)?.title ?? "",
        files: (files ?? [])
          .filter((file) => file.track_id === track.id)
          .map((file) => ({
            id: file.id,
            format: file.format,
            sizeBytes: file.size_bytes,
          })),
      }));

  return valid.flatMap((entitlement) => {
    const release = releaseById.get(entitlement.release_id);
    if (!release) return [];
    const included =
      release.release_type === "bundle"
        ? (bundleItems ?? [])
            .filter((item) => item.bundle_id === release.id)
            .flatMap((item) => tracksOf(item.release_id))
        : tracksOf(release.id);
    return [
      {
        entitlementId: entitlement.id,
        releaseId: release.id,
        title: release.title,
        type: release.release_type,
        artistName: artistName.get(release.artist_id) ?? "",
        cover: release.cover_asset_id
          ? (covers.get(release.cover_asset_id) ?? null)
          : null,
        purchasedAt: entitlement.granted_at,
        orderReference: orderById.get(entitlement.order_id)?.reference ?? "",
        downloads: downloadCount.get(entitlement.id) ?? 0,
        tracks: included,
      },
    ];
  });
}
