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
export type AppPermission =
  | "content.manage"
  | "pages.edit"
  | "pages.publish"
  | "settings.manage"
  | "demo.manage"
  | "users.manage"
  | "audit.view"
  | "music.manage"
  | "finance.manage";
export type MusicReleaseType = "track" | "ep" | "album" | "bundle";
export type MusicReleaseStatus =
  "draft" | "in_review" | "published" | "rejected" | "archived";
export type MusicFileFormat = "wav" | "flac" | "mp3" | "aiff";
export type LedgerEntryType =
  "sale" | "refund" | "adjustment" | "withdrawal" | "withdrawal_release";
export type WithdrawalStatus =
  "requested" | "approved" | "paid" | "rejected" | "cancelled";
export type ArtistMemberRole = "owner" | "manager";
export type MediaType = "image" | "video" | "audio" | "document";
export type VideoProvider =
  "cloudflare_stream" | "mux" | "youtube" | "vimeo" | "file";
export type BookingStatus =
  | "submitted"
  | "under_review"
  | "quoted"
  | "negotiating"
  | "confirmed"
  | "completed"
  | "declined"
  | "cancelled"
  | "expired";
export type EmailStatus = "pending" | "sending" | "sent" | "failed";
export type ServiceType =
  | "promotion"
  | "catering"
  | "photography"
  | "videography"
  | "aftermovie"
  | "art_gallery";
export type SellerStatus = "pending" | "approved" | "rejected" | "suspended";
export type ProductType = "physical" | "digital";
export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "fulfilled"
  | "cancelled"
  | "refunded"
  | "partially_refunded";
export type SellerOrderStatus =
  "pending" | "paid" | "shipped" | "delivered" | "cancelled" | "refunded";
export type TransferStatus = "pending" | "transferred" | "failed" | "reversed";
export type ServiceStatus =
  | "submitted"
  | "under_review"
  | "quoted"
  | "accepted"
  | "confirmed"
  | "completed"
  | "declined"
  | "cancelled"
  | "expired";
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
  cover_asset_id: string | null;
  booking_info: string | null;
  /** PDF from the media library (migration 20261122000100). */
  press_kit_asset_id: string | null;
  is_demo: boolean;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ArtistPrivateRow = {
  artist_id: string;
  music_commission_bps: number | null;
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
  product_id: string | null;
  seller_id: string | null;
  music_release_id: string | null;
  art_artist_id: string | null;
  art_exhibition_id: string | null;
  art_artwork_id: string | null;
  art_collection: ArtCollection | null;
  library: "site" | null;
  is_demo: boolean;
  focal_x: number;
  focal_y: number;
  type: MediaType;
  storage_bucket: string;
  storage_path: string;
  alt_text: string;
  credit: string | null;
  width: number | null;
  height: number | null;
  sort_order: number;
  /** File details (migration 20261122000100). */
  mime_type: string | null;
  size_bytes: number | null;
  original_name: string | null;
  duration_seconds: number | null;
  updated_at: string;
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
  /** Portrait cover for phones (migration 20261115000000). */
  mobile_cover_asset_id: string | null;
  is_demo: boolean;
  seo_title: string | null;
  seo_description: string | null;
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
  is_demo: boolean;
  seo_title: string | null;
  seo_description: string | null;

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
  art_artist_id: string | null;
  art_exhibition_id: string | null;
  status: ContentStatus;
  featured: boolean;
  poster_asset_id: string | null;
  /** Library video played when provider = 'file'. */
  file_asset_id: string | null;
  sort_order: number;
  is_demo: boolean;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type BookingRequestRow = {
  id: string;
  reference: string;
  artist_id: string;
  requester_id: string;
  organisation: string | null;
  event_name: string;
  event_date: string;
  city: string;
  country: string;
  venue_name: string | null;
  expected_attendance: number | null;
  set_length_minutes: number | null;
  budget_amount: number | null;
  budget_currency: string;
  message: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  status: BookingStatus;
  quote_amount: number | null;
  quote_currency: string | null;
  quote_note: string | null;
  assigned_staff_id: string | null;
  created_at: string;
  updated_at: string;
};

export type BookingRequestInsert = Pick<
  BookingRequestRow,
  | "artist_id"
  | "requester_id"
  | "event_name"
  | "event_date"
  | "city"
  | "country"
> &
  Partial<
    Pick<
      BookingRequestRow,
      | "organisation"
      | "venue_name"
      | "expected_attendance"
      | "set_length_minutes"
      | "budget_amount"
      | "budget_currency"
      | "message"
      | "contact_phone"
    >
  >;

export type BookingStatusHistoryRow = {
  id: number;
  booking_id: string;
  from_status: BookingStatus | null;
  to_status: BookingStatus;
  changed_by: string | null;
  note: string | null;
  created_at: string;
};

export type BookingMessageRow = {
  id: string;
  booking_id: string;
  author_id: string | null;
  body: string;
  internal: boolean;
  created_at: string;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export type EmailOutboxRow = {
  id: string;
  to_email: string;
  template: string;
  payload: Record<string, unknown>;
  status: EmailStatus;
  attempts: number;
  last_error: string | null;
  provider_message_id: string | null;
  send_after: string;
  claimed_at: string | null;
  sent_at: string | null;
  created_at: string;
};

export type ServiceProviderRow = {
  id: string;
  name: string;
  services: ServiceType[];
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  regions: string | null;
  website: string | null;
  notes: string | null;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ServiceRequestRow = {
  id: string;
  reference: string;
  service_type: ServiceType;
  requester_id: string;
  organisation: string | null;
  event_name: string;
  event_start: string;
  event_end: string | null;
  city: string;
  country: string;
  venue_name: string | null;
  expected_attendance: number | null;
  budget_amount: number | null;
  budget_currency: string;
  message: string | null;
  details: Record<string, unknown>;
  contact_phone: string | null;
  contact_email: string | null;
  status: ServiceStatus;
  quote_amount: number | null;
  quote_currency: string | null;
  quote_note: string | null;
  assigned_staff_id: string | null;
  assigned_provider_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ServiceRequestInsert = Pick<
  ServiceRequestRow,
  | "service_type"
  | "requester_id"
  | "event_name"
  | "event_start"
  | "city"
  | "country"
> &
  Partial<
    Pick<
      ServiceRequestRow,
      | "organisation"
      | "event_end"
      | "venue_name"
      | "expected_attendance"
      | "budget_amount"
      | "budget_currency"
      | "message"
      | "details"
      | "contact_phone"
    >
  >;

export type SellerRow = {
  id: string;
  owner_user_id: string;
  slug: string;
  display_name: string;
  bio: string | null;
  country: string | null;
  website: string | null;
  logo_asset_id: string | null;
  status: SellerStatus;
  shipping_flat_amount: number;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

export type SellerPrivateRow = {
  seller_id: string;
  application_note: string | null;
  commission_rate_bps: number | null;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  updated_at: string;
};

export type ProductRow = {
  id: string;
  seller_id: string;
  slug: string;
  title: string;
  description: string | null;
  product_type: ProductType;
  status: ContentStatus;
  currency: string;
  cover_asset_id: string | null;
  category_id: string | null;
  featured: boolean;
  sort_order: number;
  is_demo: boolean;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductCategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  visible: boolean;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

export type SitePageRow = {
  key: string;
  title: string;
  draft: unknown;
  published: unknown;
  draft_updated_at: string;
  published_at: string | null;
  updated_by: string | null;
  published_by: string | null;
};

export type SiteSettingsRow = Omit<SitePageRow, "key" | "title"> & {
  id: number;
};

export type AuditLogRow = {
  id: number;
  actor_id: string | null;
  action: "INSERT" | "UPDATE" | "DELETE";
  table_name: string;
  record_id: string | null;
  changed: string[];
  created_at: string;
};

export type ProductVariantRow = {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  price_amount: number;
  stock: number | null;
  active: boolean;
  sort_order: number;
};

export type SellerStripeRow = {
  seller_id: string;
  stripe_account_id: string;
  transfers_status: string;
  payouts_status: string | null;
  requirements_due: number;
  updated_at: string;
};

export type OrderRow = {
  id: string;
  reference: string;
  buyer_id: string | null;
  buyer_email: string | null;
  status: OrderStatus;
  currency: string;
  items_total: number;
  shipping_total: number;
  total: number;
  refunded_amount: number;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  shipping_name: string | null;
  shipping_address: Record<string, unknown> | null;
  access_token_hash: string;
  needs_attention: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SellerOrderRow = {
  id: string;
  order_id: string;
  seller_id: string;
  status: SellerOrderStatus;
  items_total: number;
  shipping_amount: number;
  commission_rate_bps: number;
  commission_amount: number;
  seller_amount: number;
  stripe_account_id: string;
  stripe_transfer_id: string | null;
  transfer_status: TransferStatus;
  transfer_error: string | null;
  carrier: string | null;
  tracking_number: string | null;
  shipped_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  seller_order_id: string | null;
  music_release_id: string | null;
  artist_id: string | null;
  commission_bps: number | null;
  commission_amount: number | null;
  artist_amount: number | null;
  product_id: string | null;
  variant_id: string | null;
  product_title: string;
  variant_name: string;
  product_type: ProductType;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type MusicGenreRow = {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  visible: boolean;
  created_at: string;
};

export type MusicReleaseRow = {
  id: string;
  artist_id: string;
  slug: string;
  title: string;
  release_type: MusicReleaseType;
  status: MusicReleaseStatus;
  genre_id: string | null;
  subgenre_id: string | null;
  bpm: number | null;
  musical_key: string | null;
  release_date: string | null;
  label: string | null;
  catalog_number: string | null;
  description: string | null;
  credits: string | null;
  price_amount: number | null;
  currency: string;
  formats: MusicFileFormat[];
  cover_asset_id: string | null;
  on_sale: boolean;
  featured: boolean;
  sort_order: number;
  rights_confirmed_at: string | null;
  rights_confirmed_by: string | null;
  review_note: string | null;
  submitted_at: string | null;
  published_at: string | null;
  is_demo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MusicTrackRow = {
  id: string;
  release_id: string;
  position: number;
  title: string;
  duration_seconds: number | null;
  bpm: number | null;
  musical_key: string | null;
  isrc: string | null;
  preview_path: string | null;
  created_at: string;
  updated_at: string;
};

export type MusicTrackFileRow = {
  id: string;
  track_id: string;
  format: MusicFileFormat;
  storage_path: string;
  size_bytes: number;
  created_at: string;
};

export type MusicEntitlementRow = {
  id: string;
  release_id: string;
  order_id: string;
  order_item_id: string;
  buyer_id: string | null;
  granted_at: string;
  revoked_at: string | null;
};

export type ArtistLedgerRow = {
  id: number;
  artist_id: string;
  entry_type: LedgerEntryType;
  amount: number;
  gross_amount: number;
  commission_amount: number;
  currency: string;
  order_id: string | null;
  order_item_id: string | null;
  withdrawal_id: string | null;
  available_at: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

export type ArtistWithdrawalRow = {
  id: string;
  reference: string;
  artist_id: string;
  amount: number;
  currency: string;
  status: WithdrawalStatus;
  requested_by: string | null;
  requested_at: string;
  decided_by: string | null;
  decided_at: string | null;
  paid_at: string | null;
  payout_reference: string | null;
  admin_note: string | null;
  updated_at: string;
};

export type ArtistPayoutDetailsRow = {
  artist_id: string;
  account_holder: string;
  iban: string;
  bic: string | null;
  country: string | null;
  updated_by: string | null;
  updated_at: string;
};

export type ArtistBalance = {
  gross_sales: number;
  commission: number;
  net_earnings: number;
  refunded: number;
  pending: number;
  available: number;
  in_withdrawal: number;
  withdrawn: number;
  adjustments: number;
};

export type ProductFileRow = {
  id: string;
  product_id: string;
  storage_path: string;
  file_name: string;
  size_bytes: number;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Art Gallery (migration 20261121000100)
// ---------------------------------------------------------------------------

export type ArtCollection =
  "installation" | "closeup" | "atmosphere" | "process" | "logo";
export type ArtArtistKind = "individual" | "collective";
export type ArtLinkPlatform =
  | "website"
  | "instagram"
  | "facebook"
  | "youtube"
  | "vimeo"
  | "tiktok"
  | "behance"
  | "artstation"
  | "x"
  | "linkedin"
  | "other";
export type ArtPartnerKind = "partner" | "sponsor" | "supporter" | "media";

export type ArtArtistRow = {
  id: string;
  slug: string;
  name: string;
  stage_name: string | null;
  kind: ArtArtistKind;
  tagline: string | null;
  disciplines: string[];
  specialization: string | null;
  country: string | null;
  based_in: string | null;
  bio: string | null;
  statement: string | null;
  techniques: string | null;
  website_url: string | null;
  inquiries_enabled: boolean;
  music_artist_id: string | null;
  portrait_asset_id: string | null;
  cover_asset_id: string | null;
  status: ContentStatus;
  featured: boolean;
  sort_order: number;
  is_demo: boolean;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ArtArtistLinkRow = {
  id: string;
  art_artist_id: string;
  platform: ArtLinkPlatform;
  url: string;
  sort_order: number;
};

export type ArtCollectiveMemberRow = {
  collective_id: string;
  member_id: string;
  note: string | null;
  sort_order: number;
};

export type ArtFestivalRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  website_url: string | null;
  description: string | null;
  sort_order: number;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

export type ArtExhibitionRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  festival_id: string | null;
  event_id: string | null;
  venue_name: string | null;
  city: string | null;
  country: string | null;
  /** Calendar date (YYYY-MM-DD); null means dates to be announced. */
  starts_on: string | null;
  ends_on: string | null;
  date_note: string | null;
  summary: string | null;
  overview: string | null;
  concept: string | null;
  accent_color: string | null;
  external_url: string | null;
  cover_asset_id: string | null;
  mobile_cover_asset_id: string | null;
  status: ContentStatus;
  featured: boolean;
  sort_order: number;
  is_demo: boolean;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ArtExhibitionArtistRow = {
  exhibition_id: string;
  art_artist_id: string;
  roles: string[];
  note: string | null;
  sort_order: number;
};

export type ArtArtworkRow = {
  id: string;
  slug: string;
  title: string;
  year: number | null;
  discipline: string | null;
  medium: string | null;
  width_cm: number | null;
  height_cm: number | null;
  depth_cm: number | null;
  dimensions_note: string | null;
  description: string | null;
  image_asset_id: string | null;
  status: ContentStatus;
  featured: boolean;
  sort_order: number;
  is_demo: boolean;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ArtArtworkCreditRow = {
  artwork_id: string;
  art_artist_id: string;
  credit: string | null;
  sort_order: number;
};

export type ArtExhibitionArtworkRow = {
  exhibition_id: string;
  artwork_id: string;
  sort_order: number;
};

export type ArtExhibitionPartnerRow = {
  id: string;
  exhibition_id: string;
  name: string;
  kind: ArtPartnerKind;
  url: string | null;
  logo_asset_id: string | null;
  sort_order: number;
};

type HistoryRow<Status, Fk extends string> = {
  id: number;
  from_status: Status | null;
  to_status: Status;
  changed_by: string | null;
  note: string | null;
  created_at: string;
} & Record<Fk, string>;

type MessageRow<Fk extends string> = {
  id: string;
  author_id: string | null;
  body: string;
  internal: boolean;
  created_at: string;
} & Record<Fk, string>;

export type PostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  category: string | null;
  tags: string[];
  author_name: string | null;
  cover_asset_id: string | null;
  artist_id: string | null;
  event_id: string | null;
  status: ContentStatus;
  featured: boolean;
  sort_order: number;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  is_demo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AvailabilityStatus =
  "available" | "touring" | "booked" | "unavailable";

export type ArtistAvailabilityRow = {
  id: string;
  artist_id: string;
  starts_on: string;
  ends_on: string;
  status: AvailabilityStatus;
  location: string | null;
  note: string | null;
  is_public: boolean;
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
      booking_requests: Table<
        BookingRequestRow,
        BookingRequestInsert,
        { assigned_staff_id?: string | null }
      >;
      booking_status_history: Table<BookingStatusHistoryRow, never, never>;
      booking_messages: Table<BookingMessageRow, never, never>;
      notifications: Table<
        NotificationRow,
        Pick<NotificationRow, "user_id" | "type" | "title"> &
          Partial<Pick<NotificationRow, "body" | "link">>,
        { read_at?: string | null }
      >;
      service_providers: Table<
        ServiceProviderRow,
        Pick<ServiceProviderRow, "name"> &
          Partial<Omit<ServiceProviderRow, "id" | "created_at" | "updated_at">>
      >;
      service_requests: Table<
        ServiceRequestRow,
        ServiceRequestInsert,
        {
          assigned_staff_id?: string | null;
          assigned_provider_id?: string | null;
        }
      >;
      service_request_status_history: Table<
        HistoryRow<ServiceStatus, "request_id">,
        never,
        never
      >;
      service_request_messages: Table<MessageRow<"request_id">, never, never>;
      sellers: Table<
        SellerRow,
        Pick<SellerRow, "owner_user_id" | "slug" | "display_name"> &
          Partial<Pick<SellerRow, "bio" | "country" | "website">>,
        Partial<
          Pick<
            SellerRow,
            | "display_name"
            | "bio"
            | "country"
            | "website"
            | "logo_asset_id"
            | "shipping_flat_amount"
          >
        >
      >;
      seller_stripe: Table<
        SellerStripeRow,
        Omit<SellerStripeRow, "updated_at">,
        Partial<Omit<SellerStripeRow, "seller_id" | "updated_at">>
      >;
      orders: Table<
        OrderRow,
        Pick<OrderRow, "items_total" | "total" | "access_token_hash"> &
          Partial<
            Pick<
              OrderRow,
              "buyer_id" | "buyer_email" | "currency" | "shipping_total"
            >
          >,
        Partial<
          Omit<OrderRow, "id" | "reference" | "created_at" | "updated_at">
        >
      >;
      seller_orders: Table<
        SellerOrderRow,
        Pick<
          SellerOrderRow,
          | "order_id"
          | "seller_id"
          | "items_total"
          | "shipping_amount"
          | "commission_rate_bps"
          | "commission_amount"
          | "seller_amount"
          | "stripe_account_id"
        >,
        Partial<
          Pick<
            SellerOrderRow,
            | "status"
            | "stripe_transfer_id"
            | "transfer_status"
            | "transfer_error"
          >
        >
      >;
      order_items: Table<
        OrderItemRow,
        Omit<
          OrderItemRow,
          | "id"
          | "seller_order_id"
          | "music_release_id"
          | "artist_id"
          | "commission_bps"
          | "commission_amount"
          | "artist_amount"
        > &
          Partial<
            Pick<
              OrderItemRow,
              | "seller_order_id"
              | "music_release_id"
              | "artist_id"
              | "commission_bps"
              | "commission_amount"
              | "artist_amount"
            >
          >,
        never
      >;
      stripe_events: Table<
        {
          id: string;
          type: string;
          received_at: string;
          processed_at: string | null;
          error: string | null;
        },
        { id: string; type: string },
        { processed_at?: string | null; error?: string | null }
      >;
      product_files: Table<
        ProductFileRow,
        Omit<ProductFileRow, "id" | "created_at">,
        never
      >;
      seller_private: Table<
        SellerPrivateRow,
        Pick<SellerPrivateRow, "seller_id"> &
          Partial<Pick<SellerPrivateRow, "application_note">>,
        Partial<Pick<SellerPrivateRow, "commission_rate_bps">>
      >;
      products: Table<
        ProductRow,
        Pick<ProductRow, "seller_id" | "slug" | "title"> &
          Partial<
            Pick<
              ProductRow,
              "description" | "product_type" | "status" | "currency"
            >
          >,
        Partial<
          Pick<
            ProductRow,
            | "slug"
            | "title"
            | "description"
            | "product_type"
            | "status"
            | "cover_asset_id"
            | "category_id"
            | "featured"
            | "sort_order"
            | "is_demo"
            | "seo_title"
            | "seo_description"
          >
        >
      >;
      product_categories: Table<
        ProductCategoryRow,
        Pick<ProductCategoryRow, "slug" | "name"> &
          Partial<Omit<ProductCategoryRow, "id" | "created_at" | "updated_at">>
      >;
      site_pages: Table<
        SitePageRow,
        Pick<SitePageRow, "key" | "title" | "draft">,
        Partial<Pick<SitePageRow, "title" | "draft">>
      >;
      site_settings: Table<
        SiteSettingsRow,
        Pick<SiteSettingsRow, "draft"> & { id?: number },
        Partial<Pick<SiteSettingsRow, "draft">>
      >;
      role_permissions: Table<
        { role: AppRole; permission: AppPermission },
        { role: AppRole; permission: AppPermission },
        never
      >;
      audit_log: Table<AuditLogRow, never, never>;
      platform_settings: Table<
        {
          key: string;
          value: unknown;
          updated_by: string | null;
          updated_at: string;
        },
        never,
        { value?: unknown; updated_by?: string | null }
      >;
      music_genres: Table<
        MusicGenreRow,
        Pick<MusicGenreRow, "slug" | "name"> &
          Partial<Omit<MusicGenreRow, "id" | "created_at">>
      >;
      music_releases: Table<
        MusicReleaseRow,
        Pick<MusicReleaseRow, "artist_id" | "slug" | "title"> &
          Partial<Omit<MusicReleaseRow, "id" | "created_at" | "updated_at">>
      >;
      music_tracks: Table<
        MusicTrackRow,
        Pick<MusicTrackRow, "release_id" | "title"> &
          Partial<Omit<MusicTrackRow, "id" | "created_at" | "updated_at">>
      >;
      music_track_files: Table<
        MusicTrackFileRow,
        Omit<MusicTrackFileRow, "id" | "created_at">
      >;
      music_bundle_items: Table<
        { bundle_id: string; release_id: string; sort_order: number },
        { bundle_id: string; release_id: string; sort_order?: number }
      >;
      music_entitlements: Table<MusicEntitlementRow, never, never>;
      music_downloads: Table<
        {
          id: number;
          entitlement_id: string;
          track_file_id: string | null;
          user_id: string | null;
          created_at: string;
        },
        {
          entitlement_id: string;
          track_file_id?: string | null;
          user_id?: string | null;
        },
        never
      >;
      artist_ledger: Table<ArtistLedgerRow, never, never>;
      artist_withdrawals: Table<ArtistWithdrawalRow, never, never>;
      artist_payout_details: Table<
        ArtistPayoutDetailsRow,
        Omit<ArtistPayoutDetailsRow, "updated_at" | "updated_by"> & {
          updated_by?: string | null;
        }
      >;
      product_variants: Table<
        ProductVariantRow,
        Pick<ProductVariantRow, "product_id" | "name" | "price_amount"> &
          Partial<Omit<ProductVariantRow, "id" | "product_id">>
      >;
      email_outbox: Table<
        EmailOutboxRow,
        Pick<EmailOutboxRow, "to_email" | "template" | "payload">,
        Partial<
          Pick<
            EmailOutboxRow,
            | "status"
            | "last_error"
            | "provider_message_id"
            | "sent_at"
            | "send_after"
          >
        >
      >;
      art_artists: Table<
        ArtArtistRow,
        ContentInsert<ArtArtistRow, "slug" | "name">
      >;
      art_artist_links: Table<
        ArtArtistLinkRow,
        Omit<ArtArtistLinkRow, "id" | "sort_order"> & { sort_order?: number }
      >;
      art_collective_members: Table<
        ArtCollectiveMemberRow,
        Pick<ArtCollectiveMemberRow, "collective_id" | "member_id"> &
          Partial<ArtCollectiveMemberRow>
      >;
      art_festivals: Table<
        ArtFestivalRow,
        ContentInsert<ArtFestivalRow, "slug" | "name">
      >;
      art_exhibitions: Table<
        ArtExhibitionRow,
        ContentInsert<ArtExhibitionRow, "slug" | "title">
      >;
      art_exhibition_artists: Table<
        ArtExhibitionArtistRow,
        Pick<ArtExhibitionArtistRow, "exhibition_id" | "art_artist_id"> &
          Partial<ArtExhibitionArtistRow>
      >;
      art_artworks: Table<
        ArtArtworkRow,
        ContentInsert<ArtArtworkRow, "slug" | "title">
      >;
      art_artwork_credits: Table<
        ArtArtworkCreditRow,
        Pick<ArtArtworkCreditRow, "artwork_id" | "art_artist_id"> &
          Partial<ArtArtworkCreditRow>
      >;
      art_exhibition_artworks: Table<
        ArtExhibitionArtworkRow,
        Pick<ArtExhibitionArtworkRow, "exhibition_id" | "artwork_id"> &
          Partial<ArtExhibitionArtworkRow>
      >;
      art_exhibition_partners: Table<
        ArtExhibitionPartnerRow,
        Pick<ArtExhibitionPartnerRow, "exhibition_id" | "name"> &
          Partial<Omit<ArtExhibitionPartnerRow, "id" | "exhibition_id">>
      >;
      posts: Table<PostRow, ContentInsert<PostRow, "slug" | "title">>;
      artist_availability: Table<
        ArtistAvailabilityRow,
        Pick<ArtistAvailabilityRow, "artist_id" | "starts_on" | "ends_on"> &
          Partial<
            Omit<ArtistAvailabilityRow, "id" | "created_at" | "updated_at">
          >
      >;
    };
    Views: Record<string, never>;
    Functions: {
      has_role: { Args: { required: AppRole }; Returns: boolean };
      is_staff: { Args: Record<string, never>; Returns: boolean };
      has_permission: { Args: { required: AppPermission }; Returns: boolean };
      get_published_page: { Args: { p_key: string }; Returns: unknown };
      get_published_settings: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      publish_site_page: { Args: { p_key: string }; Returns: string };
      publish_site_settings: { Args: Record<string, never>; Returns: string };
      delete_demo_content: { Args: Record<string, never>; Returns: string[] };
      submit_music_release: {
        Args: { p_release: string; p_rights_confirmed: boolean };
        Returns: MusicReleaseStatus;
      };
      review_music_release: {
        Args: {
          p_release: string;
          p_status: MusicReleaseStatus;
          p_note?: string | null;
        };
        Returns: MusicReleaseStatus;
      };
      credit_music_sales: { Args: { p_order: string }; Returns: number };
      sync_music_refunds: { Args: { p_order: string }; Returns: number };
      artist_balance: { Args: { p_artist: string }; Returns: ArtistBalance[] };
      request_withdrawal: {
        Args: { p_artist: string; p_amount: number };
        Returns: string;
      };
      cancel_withdrawal: { Args: { p_withdrawal: string }; Returns: undefined };
      decide_withdrawal: {
        Args: {
          p_withdrawal: string;
          p_status: WithdrawalStatus;
          p_note?: string | null;
          p_reference?: string | null;
        };
        Returns: WithdrawalStatus;
      };
      add_ledger_adjustment: {
        Args: { p_artist: string; p_amount: number; p_note: string };
        Returns: number;
      };
      music_top_selling: { Args: { p_limit?: number }; Returns: string[] };
      music_commission_for: { Args: { p_artist: string }; Returns: number };
      is_artist_member: { Args: { target: string }; Returns: boolean };
      is_published_artist: { Args: { target: string }; Returns: boolean };
      is_published_event: { Args: { target: string }; Returns: boolean };
      is_published_gallery: { Args: { target: string }; Returns: boolean };
      is_published_video: { Args: { target: string }; Returns: boolean };
      is_published_art_artist: { Args: { target: string }; Returns: boolean };
      is_published_art_exhibition: {
        Args: { target: string };
        Returns: boolean;
      };
      is_published_art_artwork: { Args: { target: string }; Returns: boolean };
      transition_booking: {
        Args: {
          p_booking: string;
          p_to: BookingStatus;
          p_note?: string | null;
          p_quote_amount?: number | null;
          p_quote_currency?: string | null;
          p_quote_note?: string | null;
        };
        Returns: BookingStatus;
      };
      add_booking_message: {
        Args: { p_booking: string; p_body: string; p_internal?: boolean };
        Returns: string;
      };
      transition_service_request: {
        Args: {
          p_request: string;
          p_to: ServiceStatus;
          p_note?: string | null;
          p_quote_amount?: number | null;
          p_quote_currency?: string | null;
          p_quote_note?: string | null;
        };
        Returns: ServiceStatus;
      };
      add_service_request_message: {
        Args: { p_request: string; p_body: string; p_internal?: boolean };
        Returns: string;
      };
      review_seller: {
        Args: {
          p_seller: string;
          p_status: SellerStatus;
          p_note?: string | null;
        };
        Returns: SellerStatus;
      };
      apply_order_stock: { Args: { p_order: string }; Returns: boolean };
      mark_seller_order_shipped: {
        Args: {
          p_seller_order: string;
          p_carrier?: string | null;
          p_tracking?: string | null;
        };
        Returns: undefined;
      };
      claim_email_batch: {
        Args: { p_limit?: number };
        Returns: EmailOutboxRow[];
      };
    };
    Enums: {
      app_role: AppRole;
      app_permission: AppPermission;
      music_release_type: MusicReleaseType;
      music_release_status: MusicReleaseStatus;
      music_file_format: MusicFileFormat;
      ledger_entry_type: LedgerEntryType;
      withdrawal_status: WithdrawalStatus;
      content_status: ContentStatus;
      artist_member_role: ArtistMemberRole;
      media_type: MediaType;
      link_platform: LinkPlatform;
      video_provider: VideoProvider;
      booking_status: BookingStatus;
      email_status: EmailStatus;
      service_type: ServiceType;
      service_status: ServiceStatus;
      seller_status: SellerStatus;
      product_type: ProductType;
      order_status: OrderStatus;
      seller_order_status: SellerOrderStatus;
      transfer_status: TransferStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
