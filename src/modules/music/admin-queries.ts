import "server-only";
import { toImage } from "@/lib/media";
import type {
  ArtistBalance,
  MusicReleaseStatus,
} from "@/lib/supabase/database.types";
import { hasServiceRole } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fetchImagesById } from "@/modules/media/queries";
import { MEDIA_COLUMNS } from "@/modules/media/server";

// Callers check music.manage or finance.manage first; RLS enforces the same.

const MASTER_PREVIEW_SECONDS = 30 * 60;

export async function listReleasesForAdmin(status?: MusicReleaseStatus) {
  const supabase = await createClient();
  let query = supabase
    .from("music_releases")
    .select(
      "id, slug, title, release_type, status, artist_id, price_amount, featured, sort_order, cover_asset_id, submitted_at, updated_at",
    )
    .order("submitted_at", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(500);
  if (status) query = query.eq("status", status);
  const { data } = await query;
  const rows = data ?? [];
  const [{ data: artists }, covers] = await Promise.all([
    supabase
      .from("artists")
      .select("id, slug, stage_name")
      .in("id", [...new Set(rows.map((row) => row.artist_id))]),
    fetchImagesById(
      supabase,
      rows.map((row) => row.cover_asset_id),
    ),
  ]);
  const artistById = new Map((artists ?? []).map((a) => [a.id, a]));
  return rows.map((row) => ({
    ...row,
    artist: artistById.get(row.artist_id) ?? null,
    cover: row.cover_asset_id ? (covers.get(row.cover_asset_id) ?? null) : null,
  }));
}

export async function countReleasesInReview() {
  const supabase = await createClient();
  const { count } = await supabase
    .from("music_releases")
    .select("id", { count: "exact", head: true })
    .eq("status", "in_review");
  return count ?? 0;
}

/** Everything staff need to review: tracks, previews and masters to audition. */
export async function getReleaseForReview(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data: release } = await supabase
    .from("music_releases")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!release) return null;
  const [artist, tracks, cover, bundle, genres, sales] = await Promise.all([
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
      .select("release_id")
      .eq("bundle_id", id)
      .order("sort_order"),
    supabase.from("music_genres").select("id, name"),
    supabase
      .from("order_items")
      .select("id, line_total, commission_amount, artist_amount, order_id")
      .eq("music_release_id", id),
  ]);
  const trackIds = (tracks.data ?? []).map((track) => track.id);
  const { data: files } = trackIds.length
    ? await supabase
        .from("music_track_files")
        .select("id, track_id, format, size_bytes, storage_path")
        .in("track_id", trackIds)
    : { data: [] };
  // Staff may read masters (storage policy); short links let them listen.
  const masters = new Map<string, string>();
  for (const file of files ?? []) {
    const { data } = await supabase.storage
      .from("music-masters")
      .createSignedUrl(file.storage_path, MASTER_PREVIEW_SECONDS);
    if (data?.signedUrl) masters.set(file.id, data.signedUrl);
  }
  const { data: bundleReleases } = bundle.data?.length
    ? await supabase
        .from("music_releases")
        .select("id, title, status")
        .in(
          "id",
          bundle.data.map((item) => item.release_id),
        )
    : { data: [] };
  const genreName = new Map((genres.data ?? []).map((g) => [g.id, g.name]));
  const { data: paidOrders } = sales.data?.length
    ? await supabase
        .from("orders")
        .select("id")
        .in(
          "id",
          sales.data.map((item) => item.order_id),
        )
        .in("status", ["paid", "fulfilled", "partially_refunded"])
    : { data: [] };
  const paid = new Set((paidOrders ?? []).map((order) => order.id));
  const paidLines = (sales.data ?? []).filter((item) =>
    paid.has(item.order_id),
  );

  return {
    release,
    artist: artist.data,
    cover: cover.data ? toImage(cover.data) : null,
    genre: release.genre_id ? (genreName.get(release.genre_id) ?? null) : null,
    subgenre: release.subgenre_id
      ? (genreName.get(release.subgenre_id) ?? null)
      : null,
    tracks: (tracks.data ?? []).map((track) => ({
      ...track,
      previewUrl: track.preview_path
        ? supabase.storage
            .from("music-previews")
            .getPublicUrl(track.preview_path).data.publicUrl
        : null,
      files: (files ?? [])
        .filter((file) => file.track_id === track.id)
        .map((file) => ({ ...file, url: masters.get(file.id) ?? null })),
    })),
    bundleReleases: bundleReleases ?? [],
    sales: {
      count: paidLines.length,
      gross: paidLines.reduce((sum, item) => sum + item.line_total, 0),
      commission: paidLines.reduce(
        (sum, item) => sum + (item.commission_amount ?? 0),
        0,
      ),
    },
  };
}

export async function listGenresForAdmin() {
  const supabase = await createClient();
  const [{ data: genres }, { data: releases }] = await Promise.all([
    supabase.from("music_genres").select("*").order("sort_order").order("name"),
    supabase.from("music_releases").select("genre_id, subgenre_id"),
  ]);
  return (genres ?? []).map((genre) => ({
    ...genre,
    releases: (releases ?? []).filter(
      (release) =>
        release.genre_id === genre.id || release.subgenre_id === genre.id,
    ).length,
  }));
}

/** Artists with their linked accounts, commission override and releases. */
export async function listMusicArtists() {
  const supabase = await createClient();
  const [
    { data: artists },
    { data: members },
    { data: privates },
    { data: releases },
  ] = await Promise.all([
    supabase
      .from("artists")
      .select("id, slug, stage_name, status")
      .order("stage_name"),
    supabase.from("artist_members").select("artist_id, user_id, member_role"),
    supabase.from("artist_private").select("artist_id, music_commission_bps"),
    supabase.from("music_releases").select("artist_id, status"),
  ]);
  const emails = new Map<string, string>();
  if (hasServiceRole() && members?.length) {
    const { data } = await createAdminClient().auth.admin.listUsers({
      perPage: 1000,
    });
    for (const user of data?.users ?? []) {
      if (user.email) emails.set(user.id, user.email);
    }
  }
  const { data: profiles } = members?.length
    ? await supabase
        .from("profiles")
        .select("id, display_name")
        .in(
          "id",
          members.map((member) => member.user_id),
        )
    : { data: [] };
  const nameOf = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
  const bps = new Map(
    (privates ?? []).map((p) => [p.artist_id, p.music_commission_bps]),
  );
  return (artists ?? []).map((artist) => ({
    ...artist,
    commissionBps: bps.get(artist.id) ?? null,
    releases: (releases ?? []).filter((r) => r.artist_id === artist.id).length,
    live: (releases ?? []).filter(
      (r) => r.artist_id === artist.id && r.status === "published",
    ).length,
    members: (members ?? [])
      .filter((member) => member.artist_id === artist.id)
      .map((member) => ({
        userId: member.user_id,
        role: member.member_role,
        name: nameOf.get(member.user_id) ?? null,
        email: emails.get(member.user_id) ?? null,
      })),
  }));
}

export type MusicSettings = {
  commission_bps: number;
  hold_days: number;
  min_withdrawal: number;
};

export async function getMusicSettings(): Promise<MusicSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "music")
    .maybeSingle();
  const value = (data?.value ?? {}) as Partial<MusicSettings>;
  return {
    commission_bps: value.commission_bps ?? 1500,
    hold_days: value.hold_days ?? 14,
    min_withdrawal: value.min_withdrawal ?? 2000,
  };
}

/** Platform money view: revenue, what artists are owed, payout queue. */
export async function getFinanceOverview() {
  const supabase = await createClient();
  const [
    { data: ledger },
    { data: withdrawals },
    { data: artists },
    { data: payouts },
  ] = await Promise.all([
    supabase
      .from("artist_ledger")
      .select(
        "id, artist_id, entry_type, amount, gross_amount, commission_amount, available_at, note, created_at, order_id",
      )
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase
      .from("artist_withdrawals")
      .select("*")
      .order("requested_at", { ascending: false })
      .limit(300),
    supabase.from("artists").select("id, slug, stage_name"),
    supabase.from("artist_payout_details").select("*"),
  ]);
  const entries = ledger ?? [];
  const now = Date.now();
  const sum = (
    filter: (entry: (typeof entries)[number]) => boolean,
    pick: (entry: (typeof entries)[number]) => number,
  ) => entries.filter(filter).reduce((total, entry) => total + pick(entry), 0);

  const totals = {
    gross: sum(
      (e) => e.entry_type === "sale",
      (e) => e.gross_amount,
    ),
    commission:
      sum(
        (e) => e.entry_type === "sale",
        (e) => e.commission_amount,
      ) +
      sum(
        (e) => e.entry_type === "refund",
        (e) => e.commission_amount,
      ),
    artistShare: sum(
      (e) => e.entry_type === "sale",
      (e) => e.amount,
    ),
    refunded: -sum(
      (e) => e.entry_type === "refund",
      (e) => e.gross_amount,
    ),
    // What the platform still owes artists: every entry, plus reserved payouts.
    owed:
      sum(
        () => true,
        (e) => e.amount,
      ) +
      (withdrawals ?? [])
        .filter((w) => ["requested", "approved"].includes(w.status))
        .reduce((total, w) => total + w.amount, 0),
    paidOut: (withdrawals ?? [])
      .filter((w) => w.status === "paid")
      .reduce((total, w) => total + w.amount, 0),
  };

  const artistById = new Map((artists ?? []).map((a) => [a.id, a]));
  const payoutByArtist = new Map((payouts ?? []).map((p) => [p.artist_id, p]));
  const artistIds = [...new Set(entries.map((entry) => entry.artist_id))];
  const balances: (ArtistBalance & { artistId: string; name: string })[] = [];
  for (const artistId of artistIds) {
    const own = entries.filter((entry) => entry.artist_id === artistId);
    const add = (filter: (e: (typeof own)[number]) => boolean) =>
      own.filter(filter).reduce((total, entry) => total + entry.amount, 0);
    balances.push({
      artistId,
      name: artistById.get(artistId)?.stage_name ?? "Artist",
      gross_sales: own
        .filter((e) => e.entry_type === "sale")
        .reduce((t, e) => t + e.gross_amount, 0),
      commission: own
        .filter((e) => e.entry_type === "sale")
        .reduce((t, e) => t + e.commission_amount, 0),
      net_earnings: add((e) => e.entry_type === "sale"),
      refunded: -add((e) => e.entry_type === "refund"),
      pending: add(
        (e) => e.entry_type === "sale" && Date.parse(e.available_at) > now,
      ),
      available: add((e) => Date.parse(e.available_at) <= now),
      in_withdrawal: (withdrawals ?? [])
        .filter(
          (w) =>
            w.artist_id === artistId &&
            ["requested", "approved"].includes(w.status),
        )
        .reduce((t, w) => t + w.amount, 0),
      withdrawn: (withdrawals ?? [])
        .filter((w) => w.artist_id === artistId && w.status === "paid")
        .reduce((t, w) => t + w.amount, 0),
      adjustments: add((e) => e.entry_type === "adjustment"),
    });
  }

  return {
    totals,
    balances: balances.sort((a, b) => b.available - a.available),
    queue: (withdrawals ?? [])
      .filter((w) => ["requested", "approved"].includes(w.status))
      .map((w) => ({
        ...w,
        artistName: artistById.get(w.artist_id)?.stage_name ?? "Artist",
        payout: payoutByArtist.get(w.artist_id) ?? null,
      })),
    history: (withdrawals ?? [])
      .filter((w) => !["requested", "approved"].includes(w.status))
      .slice(0, 50)
      .map((w) => ({
        ...w,
        artistName: artistById.get(w.artist_id)?.stage_name ?? "Artist",
      })),
    recent: entries.slice(0, 60).map((entry) => ({
      ...entry,
      artistName: artistById.get(entry.artist_id)?.stage_name ?? "Artist",
    })),
    artists: (artists ?? []).map((a) => ({ id: a.id, name: a.stage_name })),
  };
}
