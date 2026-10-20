import "server-only";
import { requireRole, requireUser, STAFF_ROLES } from "@/lib/auth/dal";
import type { BookingStatus } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { loadTimeline } from "@/modules/workflow/server";

// All booking reads use the signed-in user's session, so RLS decides what
// each person sees (own requests; staff see all; internal notes staff only).

const UUID = /^[0-9a-f-]{36}$/i;

async function artistNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[],
) {
  if (!ids.length) return new Map<string, { name: string; slug: string }>();
  const { data } = await supabase
    .from("artists")
    .select("id, stage_name, slug")
    .in("id", [...new Set(ids)]);
  return new Map(
    (data ?? []).map((artist) => [
      artist.id,
      { name: artist.stage_name, slug: artist.slug },
    ]),
  );
}

export async function listMyBookings() {
  const user = await requireUser("/dashboard/bookings");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("booking_requests")
    .select(
      "id, reference, artist_id, event_name, event_date, city, status, updated_at",
    )
    .eq("requester_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load bookings: ${error.message}`);
  const artists = await artistNames(
    supabase,
    data.map((row) => row.artist_id),
  );
  return data.map((row) => ({ ...row, artist: artists.get(row.artist_id) }));
}

export async function getMyBooking(id: string) {
  const user = await requireUser(`/dashboard/bookings/${id}`);
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data: booking, error } = await supabase
    .from("booking_requests")
    .select("*")
    .eq("id", id)
    .eq("requester_id", user.id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load booking: ${error.message}`);
  if (!booking) return null;

  const [artists, timeline] = await Promise.all([
    artistNames(supabase, [booking.artist_id]),
    loadTimeline<BookingStatus>(supabase, "booking", id),
  ]);
  return {
    booking,
    artist: artists.get(booking.artist_id) ?? null,
    timeline,
    userId: user.id,
  };
}

export async function listBookingsForAdmin(
  status: BookingStatus | "open" | "all",
) {
  await requireRole(STAFF_ROLES, "/admin/bookings");
  const supabase = await createClient();
  let query = supabase
    .from("booking_requests")
    .select(
      "id, reference, artist_id, event_name, event_date, city, country, status, assigned_staff_id, created_at",
    );
  if (status === "open") {
    query = query.in("status", [
      "submitted",
      "under_review",
      "quoted",
      "negotiating",
    ]);
  } else if (status !== "all") {
    query = query.eq("status", status);
  }
  const { data, error } = await query.order("created_at", {
    ascending: false,
  });
  if (error) throw new Error(`Failed to load bookings: ${error.message}`);
  const artists = await artistNames(
    supabase,
    data.map((row) => row.artist_id),
  );
  return data.map((row) => ({ ...row, artist: artists.get(row.artist_id) }));
}

export async function getBookingForAdmin(id: string) {
  const user = await requireRole(STAFF_ROLES, `/admin/bookings/${id}`);
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data: booking, error } = await supabase
    .from("booking_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load booking: ${error.message}`);
  if (!booking) return null;

  const [artists, timeline, fees] = await Promise.all([
    artistNames(supabase, [booking.artist_id]),
    loadTimeline<BookingStatus>(supabase, "booking", id),
    supabase
      .from("artist_private")
      .select("fee_min, fee_max, fee_currency")
      .eq("artist_id", booking.artist_id)
      .maybeSingle(),
  ]);
  // Names for everyone in the timeline (staff can read all profiles).
  const personIds = [
    booking.requester_id,
    booking.assigned_staff_id,
    ...timeline.map((item) => item.by),
  ].filter((value): value is string => !!value);
  const { data: people } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", [...new Set(personIds)]);

  return {
    booking,
    artist: artists.get(booking.artist_id) ?? null,
    fees: fees.data,
    timeline,
    names: new Map(
      (people ?? []).map((person) => [person.id, person.display_name]),
    ),
    userId: user.id,
  };
}

export async function getMyNotifications(limit = 30) {
  const user = await requireUser("/dashboard/notifications");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, body, link, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to load notifications: ${error.message}`);
  return data;
}

export async function countUnreadNotifications(userId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return count ?? 0;
}
