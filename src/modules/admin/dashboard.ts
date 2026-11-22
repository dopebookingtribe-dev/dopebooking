import "server-only";
import type { AppPermission } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { listAuditLog } from "./queries";

export type DashboardStat = {
  label: string;
  value: number;
  href: string;
  /** Short qualifier under the number, e.g. "3 drafts". */
  note?: string;
  /** Highlights work that is waiting on staff. */
  attention?: boolean;
};

type Head = { count: number | null; error: unknown };

/** Counts for the control room, limited to what the user may see. */
export async function getDashboard(permissions: Set<AppPermission>) {
  const supabase = await createClient();
  const can = (p: AppPermission) => permissions.has(p);
  const count = async (promise: PromiseLike<Head>) => {
    const { count, error } = await promise;
    return error ? 0 : (count ?? 0);
  };
  const head = { count: "exact", head: true } as const;
  const now = new Date().toISOString();

  const [
    artistsLive,
    artistsDraft,
    eventsUpcoming,
    videosLive,
    postsLive,
    postsDraft,
    productsLive,
    bookingsOpen,
    servicesOpen,
    sellersPending,
    ordersPaid,
    releasesReview,
    releasesLive,
    withdrawals,
    libraryFiles,
  ] = await Promise.all([
    can("content.manage")
      ? count(
          supabase.from("artists").select("id", head).eq("status", "published"),
        )
      : 0,
    can("content.manage")
      ? count(supabase.from("artists").select("id", head).eq("status", "draft"))
      : 0,
    can("content.manage")
      ? count(
          supabase
            .from("events")
            .select("id", head)
            .eq("status", "published")
            .gte("starts_at", now),
        )
      : 0,
    can("content.manage")
      ? count(
          supabase.from("videos").select("id", head).eq("status", "published"),
        )
      : 0,
    can("content.manage")
      ? count(
          supabase.from("posts").select("id", head).eq("status", "published"),
        )
      : 0,
    can("content.manage")
      ? count(supabase.from("posts").select("id", head).eq("status", "draft"))
      : 0,
    can("content.manage")
      ? count(
          supabase
            .from("products")
            .select("id", head)
            .eq("status", "published"),
        )
      : 0,
    can("content.manage")
      ? count(
          supabase
            .from("booking_requests")
            .select("id", head)
            .in("status", ["submitted", "under_review", "negotiating"]),
        )
      : 0,
    can("content.manage")
      ? count(
          supabase
            .from("service_requests")
            .select("id", head)
            .in("status", ["submitted", "under_review"]),
        )
      : 0,
    can("content.manage")
      ? count(
          supabase.from("sellers").select("id", head).eq("status", "pending"),
        )
      : 0,
    can("content.manage")
      ? count(supabase.from("orders").select("id", head).eq("status", "paid"))
      : 0,
    can("music.manage")
      ? count(
          supabase
            .from("music_releases")
            .select("id", head)
            .eq("status", "in_review"),
        )
      : 0,
    can("music.manage")
      ? count(
          supabase
            .from("music_releases")
            .select("id", head)
            .eq("status", "published"),
        )
      : 0,
    can("finance.manage")
      ? count(
          supabase
            .from("artist_withdrawals")
            .select("id", head)
            .eq("status", "requested"),
        )
      : 0,
    can("pages.edit") || can("content.manage")
      ? count(
          supabase
            .from("media_assets")
            .select("id", head)
            .not("library", "is", null),
        )
      : 0,
  ]);

  const attention: DashboardStat[] = [];
  const content: DashboardStat[] = [];
  if (can("content.manage")) {
    attention.push(
      {
        label: "Open booking requests",
        value: bookingsOpen,
        href: "/admin/bookings",
        attention: bookingsOpen > 0,
      },
      {
        label: "Open service requests",
        value: servicesOpen,
        href: "/admin/services",
        attention: servicesOpen > 0,
      },
      {
        label: "Seller applications",
        value: sellersPending,
        href: "/admin/sellers",
        attention: sellersPending > 0,
      },
      {
        label: "Paid orders to fulfil",
        value: ordersPaid,
        href: "/admin/orders",
        attention: ordersPaid > 0,
      },
    );
    content.push(
      {
        label: "Artists live",
        value: artistsLive,
        href: "/admin/artists",
        note: artistsDraft ? `${artistsDraft} in draft` : undefined,
      },
      {
        label: "Upcoming events",
        value: eventsUpcoming,
        href: "/admin/events",
      },
      { label: "Videos live", value: videosLive, href: "/admin/videos" },
      {
        label: "News posts live",
        value: postsLive,
        href: "/admin/posts",
        note: postsDraft ? `${postsDraft} in draft` : undefined,
      },
      { label: "Products live", value: productsLive, href: "/admin/products" },
    );
  }
  if (can("music.manage")) {
    attention.push({
      label: "Releases to review",
      value: releasesReview,
      href: "/admin/music",
      attention: releasesReview > 0,
    });
    content.push({
      label: "Releases live",
      value: releasesLive,
      href: "/admin/music",
    });
  }
  if (can("finance.manage")) {
    attention.push({
      label: "Payout requests",
      value: withdrawals,
      href: "/admin/music/finance",
      attention: withdrawals > 0,
    });
  }
  if (can("pages.edit") || can("content.manage")) {
    content.push({
      label: "Library files",
      value: libraryFiles,
      href: "/admin/media",
    });
  }

  const activity = can("audit.view") ? await listAuditLog(8) : [];
  return { attention, content, activity };
}

/** Shortcuts for the most common "new" actions. */
export function quickActions(permissions: Set<AppPermission>) {
  const actions: { href: string; label: string }[] = [];
  if (permissions.has("content.manage")) {
    actions.push(
      { href: "/admin/artists/new", label: "New artist" },
      { href: "/admin/events/new", label: "New event" },
      { href: "/admin/posts/new", label: "New post" },
      { href: "/admin/videos/new", label: "New video" },
      { href: "/admin/products/new", label: "New product" },
    );
  }
  if (permissions.has("music.manage")) {
    actions.push({ href: "/admin/music/new", label: "New release" });
  }
  if (permissions.has("pages.edit") || permissions.has("content.manage")) {
    actions.push({ href: "/admin/media", label: "Upload media" });
  }
  return actions;
}
