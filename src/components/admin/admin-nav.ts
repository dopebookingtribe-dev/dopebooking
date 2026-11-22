import type { AppPermission } from "@/lib/supabase/database.types";

export type AdminLink = {
  href: string;
  label: string;
  body: string;
  /** Shown to staff holding this permission (or any of these). */
  permission: AppPermission | AppPermission[];
};

export function canSee(link: AdminLink, permissions: Set<AppPermission>) {
  return [link.permission].flat().some((p) => permissions.has(p));
}

/** Admin areas, grouped. Each page also checks its permission on the server. */
export const ADMIN_GROUPS: { title: string; links: AdminLink[] }[] = [
  {
    title: "Website",
    links: [
      {
        href: "/admin/pages",
        label: "Pages",
        body: "Sections, text, photos, visibility and order of every public page.",
        permission: "pages.edit",
      },
      {
        href: "/admin/settings",
        label: "Site settings",
        body: "Brand, announcement banner, menu, footer, contact, social links, SEO.",
        permission: "settings.manage",
      },
      {
        href: "/admin/legal",
        label: "Legal pages",
        body: "Imprint, privacy, terms and the other legal texts.",
        permission: "pages.edit",
      },
      {
        href: "/admin/media",
        label: "Media library",
        body: "Images, videos, audio and documents: upload once, use anywhere.",
        permission: ["pages.edit", "content.manage"],
      },
      {
        href: "/admin/media/guidelines",
        label: "Image guidelines",
        body: "The size to design for every image on the site, desktop and mobile.",
        permission: ["pages.edit", "content.manage", "music.manage"],
      },
    ],
  },
  {
    title: "Content",
    links: [
      {
        href: "/admin/artists",
        label: "Artists",
        body: "Roster, profiles, photos, links, availability and press kits.",
        permission: "content.manage",
      },
      {
        href: "/admin/events",
        label: "Events",
        body: "Dates, venues, lineups and covers.",
        permission: "content.manage",
      },
      {
        href: "/admin/galleries",
        label: "Galleries",
        body: "Festival photo sets.",
        permission: "content.manage",
      },
      {
        href: "/admin/videos",
        label: "Videos",
        body: "Uploaded videos and links, posters, order and featuring.",
        permission: "content.manage",
      },
      {
        href: "/admin/posts",
        label: "News",
        body: "Blog posts and announcements: write, schedule and publish.",
        permission: "content.manage",
      },
      {
        href: "/admin/art",
        label: "Art Gallery",
        body: "Visual artists, exhibitions, artworks, festivals and collaboration inquiries.",
        permission: "content.manage",
      },
      {
        href: "/admin/music",
        label: "Music",
        body: "Upload and publish releases, review artists' music, genres and teams.",
        permission: "music.manage",
      },
    ],
  },
  {
    title: "Shop",
    links: [
      {
        href: "/admin/products",
        label: "Products",
        body: "Create and edit listings, prices, stock, photos and featuring.",
        permission: "content.manage",
      },
      {
        href: "/admin/categories",
        label: "Categories",
        body: "Shop categories.",
        permission: "content.manage",
      },
      {
        href: "/admin/sellers",
        label: "Sellers",
        body: "Shop applications and moderation.",
        permission: "content.manage",
      },
      {
        href: "/admin/orders",
        label: "Orders",
        body: "Payments, transfers and refunds.",
        permission: "content.manage",
      },
    ],
  },
  {
    title: "Work",
    links: [
      {
        href: "/admin/bookings",
        label: "Bookings",
        body: "Requests, quotes and conversations.",
        permission: "content.manage",
      },
      {
        href: "/admin/services",
        label: "Service requests",
        body: "Promotion, catering, production; providers.",
        permission: "content.manage",
      },
      {
        href: "/admin/music/finance",
        label: "Music finance",
        body: "Commission, artist earnings, adjustments and payouts.",
        permission: "finance.manage",
      },
    ],
  },
  {
    title: "Control",
    links: [
      {
        href: "/admin/users",
        label: "Users & permissions",
        body: "Grant roles and choose what each role may do.",
        permission: "users.manage",
      },
      {
        href: "/admin/audit",
        label: "Audit log",
        body: "Who changed what, and when.",
        permission: "audit.view",
      },
      {
        href: "/admin/demo",
        label: "Demo content",
        body: "Count and remove the sample records.",
        permission: "demo.manage",
      },
    ],
  },
];
