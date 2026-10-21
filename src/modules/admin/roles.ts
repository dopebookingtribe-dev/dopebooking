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
