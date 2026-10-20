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
  "promotion" | "catering" | "photography" | "videography" | "aftermovie";
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
  product_id: string | null;
  seller_id: string | null;
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
  published_at: string | null;
  created_at: string;
  updated_at: string;
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
  seller_order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_title: string;
  variant_name: string;
  product_type: ProductType;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type ProductFileRow = {
  id: string;
  product_id: string;
  storage_path: string;
  file_name: string;
  size_bytes: number;
  created_at: string;
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
      order_items: Table<OrderItemRow, Omit<OrderItemRow, "id">, never>;
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
          >
        >
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
