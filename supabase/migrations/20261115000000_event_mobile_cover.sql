-- Optional portrait cover for events, shown on phones (showcase cards and
-- the event page header on upright screens). Empty means "use the main
-- cover", so existing events look exactly as before.
--
-- Safe to apply at any time: the app reads this column in a separate,
-- failure-tolerant query and simply shows no phone covers until it exists.

alter table public.events
  add column if not exists mobile_cover_asset_id uuid;

alter table public.events drop constraint if exists events_mobile_cover_fk;
alter table public.events add constraint events_mobile_cover_fk
  foreign key (mobile_cover_asset_id) references public.media_assets (id)
  on delete set null;

-- Visitors read public event columns one by one (see security hardening).
grant select (mobile_cover_asset_id) on public.events to anon;
