import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { hasServiceRole } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FILE_FORMATS } from "@/modules/music/schemas";
import { tokenMatches } from "@/modules/orders/server";

// Buyers' downloads. Masters stay in a private bucket; each click checks
// the purchase, logs it and hands out a link that expires in 5 minutes.

const UUID = /^[0-9a-f-]{36}$/i;
const LINK_SECONDS = 300;
const DAILY_LIMIT = 100;
const PAID = ["paid", "fulfilled", "partially_refunded"];

const notFound = () =>
  NextResponse.json({ error: "Not found" }, { status: 404 });

/** "Artist - Title.flac", safe for any filesystem. */
function fileName(artist: string, title: string, extension: string) {
  const clean = `${artist} - ${title}`
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 150);
  return `${clean || "track"}.${extension}`;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const entitlementId = params.get("e") ?? "";
  const fileId = params.get("f") ?? "";
  const token = params.get("t") ?? undefined;
  if (!UUID.test(entitlementId) || !UUID.test(fileId) || !hasServiceRole()) {
    return notFound();
  }

  const admin = createAdminClient();
  const { data: entitlement } = await admin
    .from("music_entitlements")
    .select("id, release_id, order_id, buyer_id, revoked_at")
    .eq("id", entitlementId)
    .maybeSingle();
  if (!entitlement || entitlement.revoked_at) return notFound();
  const { data: order } = await admin
    .from("orders")
    .select("status, access_token_hash")
    .eq("id", entitlement.order_id)
    .single();
  if (!order || !PAID.includes(order.status)) return notFound();

  // The buyer's account, or the private link from a guest order.
  const user = await getCurrentUser();
  const allowed =
    (user && entitlement.buyer_id === user.id) ||
    (token !== undefined && tokenMatches(token, order.access_token_hash));
  if (!allowed) return notFound();

  // The file must belong to the purchased release (or one inside a bundle).
  const { data: file } = await admin
    .from("music_track_files")
    .select("id, format, storage_path, track_id")
    .eq("id", fileId)
    .maybeSingle();
  if (!file) return notFound();
  const { data: track } = await admin
    .from("music_tracks")
    .select("title, release_id")
    .eq("id", file.track_id)
    .single();
  if (!track) return notFound();
  if (track.release_id !== entitlement.release_id) {
    const { data: inBundle } = await admin
      .from("music_bundle_items")
      .select("release_id")
      .eq("bundle_id", entitlement.release_id)
      .eq("release_id", track.release_id)
      .maybeSingle();
    if (!inBundle) return notFound();
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("music_downloads")
    .select("id", { count: "exact", head: true })
    .eq("entitlement_id", entitlement.id)
    .gte("created_at", since);
  if ((count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json(
      { error: "Download limit reached for today. Try again tomorrow." },
      { status: 429 },
    );
  }

  const { data: release } = await admin
    .from("music_releases")
    .select("artist_id")
    .eq("id", track.release_id)
    .single();
  const { data: artist } = release
    ? await admin
        .from("artists")
        .select("stage_name")
        .eq("id", release.artist_id)
        .single()
    : { data: null };
  const { data: signed } = await admin.storage
    .from("music-masters")
    .createSignedUrl(file.storage_path, LINK_SECONDS, {
      download: fileName(
        artist?.stage_name ?? "",
        track.title,
        FILE_FORMATS[file.format].extension,
      ),
    });
  if (!signed?.signedUrl) return notFound();

  await admin.from("music_downloads").insert({
    entitlement_id: entitlement.id,
    track_file_id: file.id,
    user_id: user?.id ?? null,
  });
  return NextResponse.redirect(signed.signedUrl, {
    status: 303,
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
