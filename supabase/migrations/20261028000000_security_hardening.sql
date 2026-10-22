-- Security hardening after the full review (2026-10-22).
-- 1. Visitors (anon) can read public catalogue rows, but no longer the
--    internal account ids on them: sellers.owner_user_id and created_by.
--    Signed-in users keep full column access; RLS still limits their rows.
-- 2. Trigger functions can't be called directly by anyone.

revoke select on public.artists, public.events, public.galleries,
  public.videos, public.media_assets, public.sellers from anon;

grant select (
  id, slug, stage_name, tagline, bio, country, based_in, genres, status,
  featured, sort_order, portrait_asset_id, published_at, created_at,
  updated_at, is_demo, booking_info, cover_asset_id, seo_title, seo_description
) on public.artists to anon;

grant select (
  id, slug, title, summary, description, starts_at, ends_at, timezone,
  venue_name, city, country, ticket_url, status, featured, cover_asset_id,
  published_at, created_at, updated_at, is_demo, seo_title, seo_description
) on public.events to anon;

grant select (
  id, slug, title, description, event_id, photographer, status,
  cover_asset_id, published_at, created_at, updated_at, is_demo, seo_title,
  seo_description
) on public.galleries to anon;

grant select (
  id, slug, title, description, provider, provider_ref, event_id, artist_id,
  status, featured, poster_asset_id, published_at, created_at, updated_at,
  is_demo
) on public.videos to anon;

grant select (
  id, artist_id, type, storage_bucket, storage_path, alt_text, credit, width,
  height, sort_order, created_at, event_id, gallery_id, video_id, product_id,
  seller_id, library, is_demo, focal_x, focal_y
) on public.media_assets to anon;

grant select (
  id, slug, display_name, bio, country, website, logo_asset_id, status,
  created_at, updated_at, shipping_flat_amount, is_demo
) on public.sellers to anon;

-- Trigger functions run as triggers only.
revoke execute on function
  public.audit_row(),
  public.before_service_request_insert(),
  public.guard_product_curation(),
  public.guard_product_update(),
  public.guard_publication(),
  public.guard_seller_update(),
  public.handle_new_user(),
  public.limit_booking_requests(),
  public.on_booking_created(),
  public.on_seller_applied(),
  public.on_service_request_created(),
  public.set_booking_contact_email(),
  public.set_published_at(),
  public.set_updated_at()
from public, anon, authenticated;
