// Hand-written to match supabase/migrations. Replace with generated types
// (`npx supabase gen types typescript --linked`) once the project is linked.

export type AppRole =
  | "customer"
  | "promoter"
  | "artist"
  | "seller"
  | "provider"
  | "staff"
  | "admin";

export type ContentStatus = "draft" | "published" | "archived";
export type ArtistMemberRole = "owner" | "manager";
export type MediaType = "image";
export type VideoProvider = "cloudflare_stream" | "mux" | "youtube" | "vimeo";
export type LinkPlatform =
  | "website"
  | "instagram"
  | "soundcloud"
  | "spotify"
  | "beatport"
  | "bandcamp"
  | "youtube"
  | "facebook"
  | "resident_advisor"
  | "other";

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type ArtistRow = {
  id: string;
  slug: string;
  stage_name: string;
  tagline: string | null;
  bio: string | null;
  country: string | null;
  based_in: string | null;
  genres: string[];
  status: ContentStatus;
  featured: boolean;
  sort_order: number;
  portrait_asset_id: string | null;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ArtistPrivateRow = {
  artist_id: string;
  fee_min: number | null;
  fee_max: number | null;
  fee_currency: string;
  booking_email: string | null;
  technical_rider_path: string | null;
  hospitality_rider_path: string | null;
  internal_notes: string | null;
  updated_at: string;
};

export type ArtistLinkRow = {
  id: string;
  artist_id: string;
  platform: LinkPlatform;
  url: string;
  sort_order: number;
};

export type MediaAssetRow = {
  id: string;
  artist_id: string | null;
  event_id: string | null;
  gallery_id: string | null;
  video_id: string | null;
  type: MediaType;
  storage_bucket: string;
  storage_path: string;
  alt_text: string;
  credit: string | null;
  width: number | null;
  height: number | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
};

export type EventRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  venue_name: string | null;
  city: string | null;
  country: string | null;
  ticket_url: string | null;
  status: ContentStatus;
  featured: boolean;
  cover_asset_id: string | null;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type EventArtistRow = {
  event_id: string;
  artist_id: string;
  stage: string | null;
  set_starts_at: string | null;
  sort_order: number;
};

export type GalleryRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  event_id: string | null;
  photographer: string | null;
  status: ContentStatus;
  cover_asset_id: string | null;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type VideoRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  provider: VideoProvider;
  provider_ref: string;
  event_id: string | null;
  artist_id: string | null;
  status: ContentStatus;
  featured: boolean;
  poster_asset_id: string | null;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type ContentInsert<Row, Required extends keyof Row> = Pick<Row, Required> &
  Partial<Omit<Row, "id" | "created_at" | "updated_at">>;

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        {
          id: string;
          display_name: string | null;
          avatar_path: string | null;
          country: string | null;
          phone: string | null;
          marketing_opt_in: boolean;
          created_at: string;
          updated_at: string;
        },
        never,
        {
          display_name?: string | null;
          avatar_path?: string | null;
          country?: string | null;
          phone?: string | null;
          marketing_opt_in?: boolean;
        }
      >;
      user_roles: Table<
        {
          user_id: string;
          role: AppRole;
          granted_by: string | null;
          created_at: string;
        },
        { user_id: string; role: AppRole; granted_by?: string | null },
        never
      >;
      artists: Table<
        ArtistRow,
        Pick<ArtistRow, "slug" | "stage_name"> &
          Partial<Omit<ArtistRow, "id" | "created_at" | "updated_at">>
      >;
      artist_members: Table<
        {
          artist_id: string;
          user_id: string;
          member_role: ArtistMemberRole;
          created_at: string;
        },
        { artist_id: string; user_id: string; member_role?: ArtistMemberRole }
      >;
      artist_private: Table<
        ArtistPrivateRow,
        Pick<ArtistPrivateRow, "artist_id"> &
          Partial<Omit<ArtistPrivateRow, "artist_id" | "updated_at">>
      >;
      artist_links: Table<
        ArtistLinkRow,
        Omit<ArtistLinkRow, "id" | "sort_order"> & { sort_order?: number }
      >;
      media_assets: Table<
        MediaAssetRow,
        Pick<MediaAssetRow, "storage_path" | "alt_text"> &
          Partial<Omit<MediaAssetRow, "id" | "created_at">>
      >;
      events: Table<
        EventRow,
        ContentInsert<EventRow, "slug" | "title" | "starts_at">
      >;
      event_artists: Table<
        EventArtistRow,
        Pick<EventArtistRow, "event_id" | "artist_id"> & Partial<EventArtistRow>
      >;
      galleries: Table<GalleryRow, ContentInsert<GalleryRow, "slug" | "title">>;
      videos: Table<
        VideoRow,
        ContentInsert<VideoRow, "slug" | "title" | "provider" | "provider_ref">
      >;
    };
    Views: Record<string, never>;
    Functions: {
      has_role: { Args: { required: AppRole }; Returns: boolean };
      is_staff: { Args: Record<string, never>; Returns: boolean };
      is_artist_member: { Args: { target: string }; Returns: boolean };
      is_published_artist: { Args: { target: string }; Returns: boolean };
      is_published_event: { Args: { target: string }; Returns: boolean };
      is_published_gallery: { Args: { target: string }; Returns: boolean };
      is_published_video: { Args: { target: string }; Returns: boolean };
    };
    Enums: {
      app_role: AppRole;
      content_status: ContentStatus;
      artist_member_role: ArtistMemberRole;
      media_type: MediaType;
      link_platform: LinkPlatform;
      video_provider: VideoProvider;
    };
    CompositeTypes: Record<string, never>;
  };
};
