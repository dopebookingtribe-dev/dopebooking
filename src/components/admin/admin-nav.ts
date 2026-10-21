import type { AppPermission } from "@/lib/supabase/database.types";

export type AdminLink = {
  href: string;
  label: string;
  body: string;
  permission: AppPermission;
};

/** Admin areas, grouped. Each page also checks its permission on the server. */
export const ADMIN_GROUPS: { title: string; links: AdminLink[] }[] = [
  {
    title: "Website",
    links: [
      {
        href: "/admin/pages",
        label: "Pages",
        body: "Sections, text, photos and order of every public page.",
        permission: "pages.edit",
      },
      {
        href: "/admin/media",
        label: "Media library",
        body: "Photos for heroes, galleries and sharing.",
        permission: "pages.edit",
      },
      {
        href: "/admin/settings",
        label: "Site settings",
        body: "Menu, footer, contact, social links, SEO.",
        permission: "settings.manage",
      },
    ],
  },
  {
    title: "Catalogue",
    links: [
      {
        href: "/admin/artists",
        label: "Artists",
        body: "Roster, profiles, photos, links and featuring.",
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
        body: "Aftermovies and sets from any video link.",
        permission: "content.manage",
      },
      {
        href: "/admin/products",
        label: "Products",
        body: "Featuring, categories and order in the shop.",
        permission: "content.manage",
      },
      {
        href: "/admin/categories",
        label: "Categories",
        body: "Shop categories.",
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
    title: "Control",
    links: [
      {
        href: "/admin/users",
        label: "Users and roles",
        body: "Grant and remove access.",
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
