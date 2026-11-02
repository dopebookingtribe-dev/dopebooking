import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { commissionFor, DEFAULT_COMMISSION_BPS } from "@/modules/orders/split";
import { MUSIC_CURRENCY } from "./schemas";

// Server-only music checkout logic, called by the shared order checkout with
// the service role after the cart was parsed.

type Admin = ReturnType<typeof createAdminClient>;

export type MusicCheckoutLine = {
  releaseId: string;
  artistId: string;
  title: string;
  artistName: string;
  price: number;
  commissionBps: number;
  commission: number;
  artistAmount: number;
};

/**
 * Re-prices music from the database and snapshots each artist's share.
 * The commission is the artist's override, else the platform default.
 */
export async function priceMusicForCheckout(
  supabase: Admin,
  releaseIds: string[],
  buyerId: string | null,
): Promise<{ lines: MusicCheckoutLine[]; problems: string[] }> {
  const ids = [...new Set(releaseIds)];
  if (!ids.length) return { lines: [], problems: [] };

  const { data: releases } = await supabase
    .from("music_releases")
    .select("id, title, artist_id, status, on_sale, price_amount, currency")
    .in("id", ids);
  const artistIds = [...new Set((releases ?? []).map((r) => r.artist_id))];
  const [{ data: artists }, { data: overrides }, { data: settings }, owned] =
    await Promise.all([
      supabase
        .from("artists")
        .select("id, stage_name, status")
        .in("id", artistIds),
      supabase
        .from("artist_private")
        .select("artist_id, music_commission_bps")
        .in("artist_id", artistIds),
      supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "music")
        .maybeSingle(),
      buyerId
        ? supabase
            .from("music_entitlements")
            .select("release_id")
            .eq("buyer_id", buyerId)
            .is("revoked_at", null)
            .in("release_id", ids)
        : Promise.resolve({ data: [] as { release_id: string }[] }),
    ]);

  const value = (settings?.value ?? {}) as { commission_bps?: number };
  const defaultBps = Number.isInteger(value.commission_bps)
    ? value.commission_bps!
    : DEFAULT_COMMISSION_BPS;
  const artistById = new Map((artists ?? []).map((a) => [a.id, a]));
  const bpsByArtist = new Map(
    (overrides ?? []).map((o) => [o.artist_id, o.music_commission_bps]),
  );
  const ownedIds = new Set((owned.data ?? []).map((row) => row.release_id));
  const releaseById = new Map((releases ?? []).map((r) => [r.id, r]));

  const lines: MusicCheckoutLine[] = [];
  const problems: string[] = [];
  for (const id of ids) {
    const release = releaseById.get(id);
    const artist = release ? artistById.get(release.artist_id) : undefined;
    if (
      !release ||
      !artist ||
      release.status !== "published" ||
      artist.status !== "published" ||
      !release.on_sale ||
      release.price_amount === null
    ) {
      problems.push("A release in your cart is no longer for sale.");
      continue;
    }
    if (release.currency !== MUSIC_CURRENCY) {
      problems.push(`${release.title} can't be bought right now.`);
      continue;
    }
    if (ownedIds.has(release.id)) {
      problems.push(
        `You already own ${release.title}. Find it in your music library.`,
      );
      continue;
    }
    const commissionBps = bpsByArtist.get(artist.id) ?? defaultBps;
    const commission = commissionFor(release.price_amount, commissionBps);
    lines.push({
      releaseId: release.id,
      artistId: artist.id,
      title: release.title,
      artistName: artist.stage_name,
      price: release.price_amount,
      commissionBps,
      commission,
      artistAmount: release.price_amount - commission,
    });
  }
  return { lines, problems };
}
