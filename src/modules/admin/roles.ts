/** Roles an admin may grant on the users page. Seller access goes through applications. */
export const GRANTABLE_ROLES = [
  "staff",
  "admin",
  "promoter",
  "artist",
  "provider",
] as const;

export const ROLE_LABELS: Record<string, string> = {
  admin: "Super admin",
  staff: "Staff",
  customer: "Customer",
  promoter: "Promoter",
  artist: "Artist",
  seller: "Seller",
  provider: "Service provider",
};

/** What each permission opens up, for the permission matrix. */
export const PERMISSION_LABELS: Record<
  string,
  { label: string; body: string }
> = {
  "content.manage": {
    label: "Content",
    body: "Artists, events, galleries, videos, news, Art Gallery, products, bookings and requests.",
  },
  "pages.edit": {
    label: "Edit pages",
    body: "Page and legal drafts, media library.",
  },
  "pages.publish": {
    label: "Publish pages",
    body: "Make page, legal and settings drafts live.",
  },
  "settings.manage": {
    label: "Site settings",
    body: "Brand, banner, menu, footer, contact, SEO.",
  },
  "music.manage": {
    label: "Music",
    body: "Upload, review and publish releases; genres; artist teams.",
  },
  "finance.manage": {
    label: "Finance",
    body: "Commission, artist payouts and ledger adjustments.",
  },
  "audit.view": { label: "Audit log", body: "See who changed what." },
  "demo.manage": { label: "Demo content", body: "Remove the sample records." },
  "users.manage": {
    label: "Users & permissions",
    body: "Grant roles and change this matrix.",
  },
};

/** Roles whose permissions can be changed here (admin always has all). */
export const EDITABLE_PERMISSION_ROLES = ["staff"] as const;
