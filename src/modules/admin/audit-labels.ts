/** Human names for audited tables (audit_row triggers). */
export const AUDIT_TABLES: Record<string, string> = {
  artists: "Artist",
  artist_private: "Artist booking info",
  artist_availability: "Artist availability",
  events: "Event",
  galleries: "Gallery",
  videos: "Video",
  posts: "News post",
  products: "Product",
  product_categories: "Shop category",
  sellers: "Shop",
  media_assets: "Media file",
  site_pages: "Page",
  site_settings: "Site settings",
  user_roles: "User role",
  role_permissions: "Role permission",
  music_releases: "Music release",
  music_genres: "Music genre",
  platform_settings: "Platform setting",
  art_artists: "Visual artist",
  art_exhibitions: "Exhibition",
  art_artworks: "Artwork",
  art_festivals: "Art festival",
};

export const AUDIT_ACTIONS = {
  INSERT: "Created",
  UPDATE: "Changed",
  DELETE: "Deleted",
} as const;

export type AuditAction = keyof typeof AUDIT_ACTIONS;
