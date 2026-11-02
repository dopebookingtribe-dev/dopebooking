-- Phase 11: music marketplace. Artists sell tracks, EPs, albums and bundles
-- from their existing profile. Music shares the shop's cart, orders and
-- Stripe checkout; instead of Stripe transfers, each paid music line credits
-- the artist's internal ledger. Credits become withdrawable after a hold
-- period; withdrawals are approved and paid by admins.
-- See docs/PROJECT_ARCHITECTURE.md §11.

insert into public.role_permissions (role, permission) values
  ('admin', 'music.manage'),
  ('admin', 'finance.manage'),
  ('staff', 'music.manage')
on conflict do nothing;

create type public.music_release_type as enum ('track', 'ep', 'album', 'bundle');
create type public.music_release_status as enum (
  'draft', 'in_review', 'published', 'rejected', 'archived'
);
create type public.music_file_format as enum ('wav', 'flac', 'mp3', 'aiff');
create type public.ledger_entry_type as enum (
  'sale', 'refund', 'adjustment', 'withdrawal', 'withdrawal_release'
);
create type public.withdrawal_status as enum (
  'requested', 'approved', 'paid', 'rejected', 'cancelled'
);

-- ---------------------------------------------------------------------------
-- Settings: commission, hold period, minimum withdrawal
-- ---------------------------------------------------------------------------

create table public.platform_settings (
  key text primary key check (key ~ '^[a-z_]+$'),
  value jsonb not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (key, value) values
  ('music', '{"commission_bps": 1500, "hold_days": 14, "min_withdrawal": 2000}');

create trigger platform_settings_set_updated_at before update on public.platform_settings
for each row execute function public.set_updated_at();

-- Optional per-artist commission, overriding the platform default.
alter table public.artist_private
  add column music_commission_bps integer check (music_commission_bps between 0 and 5000);

create function public.music_setting(p_name text, p_default integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select (value ->> p_name)::integer from public.platform_settings where key = 'music'),
    p_default
  );
$$;

create function public.music_commission_for(p_artist uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select music_commission_bps from public.artist_private where artist_id = p_artist),
    public.music_setting('commission_bps', 1500)
  );
$$;

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------

create table public.music_genres (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  name text not null check (char_length(name) between 1 and 60),
  parent_id uuid references public.music_genres (id) on delete cascade,
  sort_order integer not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  check (parent_id is distinct from id)
);

create index music_genres_parent_idx on public.music_genres (parent_id, sort_order);

with top as (
  insert into public.music_genres (slug, name, sort_order) values
    ('psytrance', 'Psytrance', 0),
    ('techno', 'Techno', 1),
    ('ambient', 'Ambient', 2),
    ('house', 'House', 3),
    ('electronica', 'Electronica', 4)
  returning id, slug
)
insert into public.music_genres (slug, name, parent_id, sort_order)
select s.slug, s.name, top.id, s.sort_order
from (values
  ('progressive-psytrance', 'Progressive', 'psytrance', 0),
  ('full-on', 'Full-on', 'psytrance', 1),
  ('goa', 'Goa', 'psytrance', 2),
  ('dark-psy', 'Dark', 'psytrance', 3),
  ('forest', 'Forest', 'psytrance', 4),
  ('hi-tech', 'Hi-tech', 'psytrance', 5),
  ('twilight', 'Twilight', 'psytrance', 6),
  ('psy-techno', 'Psy-techno', 'techno', 0),
  ('melodic-techno', 'Melodic techno', 'techno', 1),
  ('hypnotic-techno', 'Hypnotic techno', 'techno', 2),
  ('peak-time-techno', 'Peak time', 'techno', 3),
  ('psybient', 'Psybient', 'ambient', 0),
  ('chill-out', 'Chill-out', 'ambient', 1),
  ('downtempo', 'Downtempo', 'ambient', 2),
  ('progressive-house', 'Progressive house', 'house', 0),
  ('organic-house', 'Organic house', 'house', 1),
  ('idm', 'IDM', 'electronica', 0),
  ('breaks', 'Breaks', 'electronica', 1)
) as s (slug, name, parent, sort_order)
join top on top.slug = s.parent;

create table public.music_releases (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  slug text not null
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 90),
  title text not null check (char_length(title) between 1 and 160),
  release_type public.music_release_type not null default 'track',
  status public.music_release_status not null default 'draft',
  genre_id uuid references public.music_genres (id) on delete set null,
  subgenre_id uuid references public.music_genres (id) on delete set null,
  bpm integer check (bpm between 40 and 250),
  musical_key text check (char_length(musical_key) <= 12),
  release_date date,
  label text check (char_length(label) <= 120),
  catalog_number text check (char_length(catalog_number) <= 40),
  description text check (char_length(description) <= 6000),
  credits text check (char_length(credits) <= 3000),
  price_amount integer check (price_amount between 50 and 100000),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  cover_asset_id uuid references public.media_assets (id) on delete set null,
  on_sale boolean not null default true,
  featured boolean not null default false,
  sort_order integer not null default 0,
  rights_confirmed_at timestamptz,
  rights_confirmed_by uuid references public.profiles (id) on delete set null,
  review_note text check (char_length(review_note) <= 2000),
  submitted_at timestamptz,
  published_at timestamptz,
  is_demo boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (artist_id, slug)
);

create index music_releases_public_idx on public.music_releases (status, published_at desc);
create index music_releases_artist_idx on public.music_releases (artist_id, created_at desc);
create index music_releases_genre_idx on public.music_releases (genre_id);

create table public.music_tracks (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.music_releases (id) on delete cascade,
  position integer not null default 1 check (position between 1 and 200),
  title text not null check (char_length(title) between 1 and 160),
  duration_seconds integer check (duration_seconds between 1 and 21600),
  bpm integer check (bpm between 40 and 250),
  musical_key text check (char_length(musical_key) <= 12),
  isrc text check (isrc ~ '^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$'),
  -- Short public clip in the music-previews bucket; never the master.
  preview_path text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index music_tracks_release_idx on public.music_tracks (release_id, position);

-- Full-quality files in the private music-masters bucket.
create table public.music_track_files (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.music_tracks (id) on delete cascade,
  format public.music_file_format not null,
  storage_path text not null unique,
  size_bytes bigint not null check (size_bytes > 0),
  created_at timestamptz not null default now(),
  unique (track_id, format)
);

create table public.music_bundle_items (
  bundle_id uuid not null references public.music_releases (id) on delete cascade,
  release_id uuid not null references public.music_releases (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (bundle_id, release_id),
  check (bundle_id <> release_id)
);

-- Public list of the formats a release can be downloaded in, kept in step
-- with the private file table (which visitors can't read).
alter table public.music_releases
  add column formats public.music_file_format[] not null default '{}';

create function public.refresh_release_formats()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_release uuid;
begin
  select release_id into v_release from public.music_tracks
  where id = coalesce(new.track_id, old.track_id);
  if v_release is null then
    return null;
  end if;
  perform set_config('dopebooking.music', 'on', true);
  update public.music_releases r
     set formats = coalesce((
       select array_agg(distinct f.format order by f.format)
       from public.music_track_files f
       join public.music_tracks t on t.id = f.track_id
       where t.release_id = v_release
     ), '{}')
   where r.id = v_release;
  perform set_config('dopebooking.music', 'off', true);
  return null;
end;
$$;

create trigger music_track_files_formats after insert or update or delete on public.music_track_files
for each row execute function public.refresh_release_formats();
revoke execute on function public.refresh_release_formats() from public, anon, authenticated;

create trigger music_releases_set_updated_at before update on public.music_releases
for each row execute function public.set_updated_at();
create trigger music_tracks_set_updated_at before update on public.music_tracks
for each row execute function public.set_updated_at();

-- Covers live in public-media like every other image.
alter table public.media_assets
  add column music_release_id uuid references public.music_releases (id) on delete cascade;
alter table public.media_assets drop constraint media_assets_one_owner;
alter table public.media_assets add constraint media_assets_one_owner
  check (num_nonnulls(artist_id, event_id, gallery_id, video_id, product_id, seller_id, library, music_release_id) = 1);
create index media_assets_music_release_idx on public.media_assets (music_release_id);
grant select (music_release_id) on public.media_assets to anon;

-- ---------------------------------------------------------------------------
-- Orders: music lines sit beside shop lines, with the split snapshotted
-- ---------------------------------------------------------------------------

alter table public.order_items
  alter column seller_order_id drop not null,
  add column music_release_id uuid references public.music_releases (id) on delete restrict,
  add column artist_id uuid references public.artists (id) on delete restrict,
  add column commission_bps integer check (commission_bps between 0 and 5000),
  add column commission_amount integer check (commission_amount >= 0),
  add column artist_amount integer check (artist_amount >= 0),
  add constraint order_items_one_kind check (
    (seller_order_id is not null and music_release_id is null)
    or (
      seller_order_id is null and music_release_id is not null
      and artist_id is not null and commission_bps is not null
      and commission_amount is not null and artist_amount is not null
      and artist_amount + commission_amount = line_total
    )
  );

create index order_items_music_idx on public.order_items (music_release_id);
create index order_items_artist_idx on public.order_items (artist_id);

-- What a buyer owns. Bundles grant their included releases at download time.
create table public.music_entitlements (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.music_releases (id) on delete restrict,
  order_id uuid not null references public.orders (id) on delete cascade,
  order_item_id uuid not null unique references public.order_items (id) on delete cascade,
  buyer_id uuid references public.profiles (id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index music_entitlements_buyer_idx on public.music_entitlements (buyer_id, granted_at desc);
create index music_entitlements_order_idx on public.music_entitlements (order_id);

create table public.music_downloads (
  id bigint generated always as identity primary key,
  entitlement_id uuid not null references public.music_entitlements (id) on delete cascade,
  track_file_id uuid references public.music_track_files (id) on delete set null,
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index music_downloads_entitlement_idx on public.music_downloads (entitlement_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Money: an append-only ledger per artist, payout details, withdrawals
-- ---------------------------------------------------------------------------

create table public.artist_withdrawals (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique
    default ('WD-' || upper(substr(md5(gen_random_uuid()::text), 1, 8))),
  artist_id uuid not null references public.artists (id) on delete restrict,
  amount integer not null check (amount > 0),
  currency text not null default 'EUR',
  status public.withdrawal_status not null default 'requested',
  requested_by uuid references public.profiles (id) on delete set null,
  requested_at timestamptz not null default now(),
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  paid_at timestamptz,
  payout_reference text check (char_length(payout_reference) <= 120),
  admin_note text check (char_length(admin_note) <= 1000),
  updated_at timestamptz not null default now()
);

create index artist_withdrawals_artist_idx on public.artist_withdrawals (artist_id, requested_at desc);
create index artist_withdrawals_status_idx on public.artist_withdrawals (status, requested_at);

create trigger artist_withdrawals_set_updated_at before update on public.artist_withdrawals
for each row execute function public.set_updated_at();

create table public.artist_ledger (
  id bigint generated always as identity primary key,
  artist_id uuid not null references public.artists (id) on delete restrict,
  entry_type public.ledger_entry_type not null,
  -- Signed cents moving the artist's balance.
  amount integer not null,
  -- For sales and refunds: the gross line amount and the platform's part.
  gross_amount integer not null default 0,
  commission_amount integer not null default 0,
  currency text not null default 'EUR',
  order_id uuid references public.orders (id) on delete restrict,
  order_item_id uuid references public.order_items (id) on delete restrict,
  withdrawal_id uuid references public.artist_withdrawals (id) on delete restrict,
  -- Sales become withdrawable after the hold period; everything else at once.
  available_at timestamptz not null default now(),
  note text check (char_length(note) <= 500),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index artist_ledger_artist_idx on public.artist_ledger (artist_id, created_at desc);
-- A paid line is credited exactly once, however often the webhook arrives.
create unique index artist_ledger_one_sale on public.artist_ledger (order_item_id)
  where entry_type = 'sale';

create table public.artist_payout_details (
  artist_id uuid primary key references public.artists (id) on delete cascade,
  account_holder text not null check (char_length(account_holder) between 2 and 120),
  iban text not null check (iban ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$'),
  bic text check (bic ~ '^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$'),
  country text check (country ~ '^[A-Z]{2}$'),
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create trigger artist_payout_details_set_updated_at before update on public.artist_payout_details
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function public.is_release_member(p_release uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.music_releases r
    join public.artist_members m on m.artist_id = r.artist_id
    where r.id = p_release and m.user_id = (select auth.uid())
  );
$$;

create function public.is_published_release(p_release uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.music_releases r
    join public.artists a on a.id = r.artist_id
    where r.id = p_release and r.status = 'published' and a.status = 'published'
  );
$$;

-- Tracks and files can change only while the release isn't under review or live.
create function public.is_release_editable(p_release uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_permission('music.manage') or (
    public.is_release_member(p_release) and exists (
      select 1 from public.music_releases
      where id = p_release and status in ('draft', 'rejected', 'archived')
    )
  );
$$;

revoke execute on function public.is_release_member(uuid), public.is_release_editable(uuid) from public, anon;
grant execute on function public.is_release_member(uuid), public.is_release_editable(uuid) to authenticated;
revoke execute on function public.is_published_release(uuid) from public;
grant execute on function public.is_published_release(uuid) to anon, authenticated;
revoke execute on function public.music_setting(text, integer), public.music_commission_for(uuid) from public, anon;
grant execute on function public.music_setting(text, integer), public.music_commission_for(uuid) to authenticated;

-- Artists edit their own releases; review, featuring and publishing stay
-- with staff. Workflow functions set dopebooking.music to 'on' to pass.
create function public.guard_music_release()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trusted boolean := (select auth.uid()) is null
    or coalesce(current_setting('dopebooking.music', true), '') = 'on'
    or public.has_permission('music.manage');
begin
  if v_trusted then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.status <> 'draft' or new.featured or new.is_demo
       or new.rights_confirmed_at is not null or new.published_at is not null then
      raise exception 'New releases start as drafts' using errcode = '42501';
    end if;
    return new;
  end if;
  if new.artist_id is distinct from old.artist_id
     or new.featured is distinct from old.featured
     or new.sort_order is distinct from old.sort_order
     or new.is_demo is distinct from old.is_demo
     or new.review_note is distinct from old.review_note
     or new.rights_confirmed_at is distinct from old.rights_confirmed_at
     or new.rights_confirmed_by is distinct from old.rights_confirmed_by
     or new.submitted_at is distinct from old.submitted_at
     or new.published_at is distinct from old.published_at then
    raise exception 'Not allowed to change review fields' using errcode = '42501';
  end if;
  if new.status is distinct from old.status and not (
    (old.status = 'published' and new.status = 'archived')
    or (old.status in ('rejected', 'archived', 'in_review') and new.status = 'draft')
  ) then
    raise exception 'Use submit for review to publish' using errcode = '42501';
  end if;
  -- While under review nothing changes; while live only price, text and
  -- availability do.
  if old.status = 'in_review' and new.status = 'in_review' then
    raise exception 'Withdraw the release from review to edit it' using errcode = '42501';
  end if;
  if old.status = 'published' and new.status = 'published' and (
    new.title is distinct from old.title
    or new.slug is distinct from old.slug
    or new.release_type is distinct from old.release_type
    or new.genre_id is distinct from old.genre_id
    or new.subgenre_id is distinct from old.subgenre_id
    or new.bpm is distinct from old.bpm
    or new.musical_key is distinct from old.musical_key
    or new.release_date is distinct from old.release_date
    or new.cover_asset_id is distinct from old.cover_asset_id
    or new.label is distinct from old.label
    or new.catalog_number is distinct from old.catalog_number
  ) then
    raise exception 'Unpublish the release to change its details' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger music_releases_guard before insert or update on public.music_releases
for each row execute function public.guard_music_release();

-- Bundles hold other releases by the same artist.
create function public.check_bundle_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.music_releases b join public.music_releases r on r.artist_id = b.artist_id
    where b.id = new.bundle_id and b.release_type = 'bundle'
      and r.id = new.release_id and r.release_type <> 'bundle'
  ) then
    raise exception 'A bundle holds other releases by the same artist' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger music_bundle_items_check before insert or update on public.music_bundle_items
for each row execute function public.check_bundle_item();

-- ---------------------------------------------------------------------------
-- Workflow: submit, review
-- ---------------------------------------------------------------------------

create function public.submit_music_release(p_release uuid, p_rights_confirmed boolean)
returns public.music_release_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_release public.music_releases;
begin
  select * into v_release from public.music_releases where id = p_release for update;
  if not found or not public.is_release_member(p_release) then
    raise exception 'Release not found' using errcode = '42501';
  end if;
  if v_release.status not in ('draft', 'rejected', 'archived') then
    raise exception 'This release is already submitted' using errcode = '22023';
  end if;
  if not coalesce(p_rights_confirmed, false) then
    raise exception 'Confirm that you own the rights' using errcode = '22023';
  end if;
  if v_release.cover_asset_id is null then
    raise exception 'Add cover artwork' using errcode = '22023';
  end if;
  if v_release.price_amount is null then
    raise exception 'Set a price' using errcode = '22023';
  end if;
  if v_release.genre_id is null then
    raise exception 'Choose a genre' using errcode = '22023';
  end if;
  if v_release.release_type = 'bundle' then
    if (select count(*) from public.music_bundle_items where bundle_id = p_release) < 2 then
      raise exception 'A bundle needs at least two releases' using errcode = '22023';
    end if;
  else
    if not exists (select 1 from public.music_tracks where release_id = p_release) then
      raise exception 'Add at least one track' using errcode = '22023';
    end if;
    if exists (
      select 1 from public.music_tracks t
      where t.release_id = p_release
        and (t.preview_path is null
          or not exists (select 1 from public.music_track_files f where f.track_id = t.id))
    ) then
      raise exception 'Every track needs an audio file and a preview' using errcode = '22023';
    end if;
  end if;

  perform set_config('dopebooking.music', 'on', true);
  update public.music_releases
     set status = 'in_review',
         submitted_at = now(),
         rights_confirmed_at = now(),
         rights_confirmed_by = (select auth.uid()),
         review_note = null
   where id = p_release;
  perform set_config('dopebooking.music', 'off', true);
  return 'in_review';
end;
$$;

create function public.review_music_release(
  p_release uuid,
  p_status public.music_release_status,
  p_note text default null
)
returns public.music_release_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_release public.music_releases;
begin
  if not public.has_permission('music.manage') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_status not in ('published', 'rejected', 'archived') then
    raise exception 'Choose publish, reject or archive' using errcode = '22023';
  end if;
  select * into v_release from public.music_releases where id = p_release for update;
  if not found then
    raise exception 'Release not found' using errcode = 'P0002';
  end if;
  if p_status = 'rejected' and coalesce(trim(p_note), '') = '' then
    raise exception 'Tell the artist what to change' using errcode = '22023';
  end if;

  update public.music_releases
     set status = p_status,
         review_note = nullif(trim(p_note), ''),
         published_at = case when p_status = 'published' then coalesce(published_at, now()) else published_at end
   where id = p_release;

  insert into public.notifications (user_id, type, title, body, link)
  select m.user_id, 'music_review',
         case p_status
           when 'published' then v_release.title || ' is live'
           when 'rejected' then v_release.title || ' needs changes'
           else v_release.title || ' was archived'
         end,
         nullif(trim(p_note), ''),
         '/dashboard/music/' || v_release.id
  from public.artist_members m where m.artist_id = v_release.artist_id;
  return p_status;
end;
$$;

revoke execute on function public.submit_music_release(uuid, boolean),
  public.review_music_release(uuid, public.music_release_status, text) from public, anon;
grant execute on function public.submit_music_release(uuid, boolean),
  public.review_music_release(uuid, public.music_release_status, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Money: credit paid sales, follow refunds, balances, withdrawals
-- ---------------------------------------------------------------------------

/**
 * Credits each music line of a paid order to its artist and grants the
 * buyer access. Idempotent: the unique index on sale entries and on
 * entitlements means repeated webhooks credit nothing twice.
 * Server only (service role): called after Stripe confirms payment.
 */
create function public.credit_music_sales(p_order uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_hold integer := public.music_setting('hold_days', 14);
  v_item record;
  v_credited integer := 0;
  v_entry bigint;
begin
  select * into v_order from public.orders where id = p_order for update;
  if not found or v_order.status not in ('paid', 'fulfilled', 'partially_refunded') or v_order.paid_at is null then
    return 0;
  end if;

  for v_item in
    select oi.*, r.title as release_title
    from public.order_items oi
    join public.music_releases r on r.id = oi.music_release_id
    where oi.order_id = p_order and oi.music_release_id is not null
  loop
    insert into public.music_entitlements (release_id, order_id, order_item_id, buyer_id)
    values (v_item.music_release_id, p_order, v_item.id, v_order.buyer_id)
    on conflict (order_item_id) do nothing;

    v_entry := null;
    insert into public.artist_ledger (
      artist_id, entry_type, amount, gross_amount, commission_amount,
      currency, order_id, order_item_id, available_at, note
    ) values (
      v_item.artist_id, 'sale', v_item.artist_amount, v_item.line_total, v_item.commission_amount,
      v_order.currency, p_order, v_item.id, v_order.paid_at + make_interval(days => v_hold),
      'Sale of ' || v_item.release_title || ' (' || v_order.reference || ')'
    )
    on conflict (order_item_id) where entry_type = 'sale' do nothing
    returning id into v_entry;

    if v_entry is not null then
      v_credited := v_credited + 1;
      insert into public.notifications (user_id, type, title, body, link)
      select m.user_id, 'music_sale', 'You sold ' || v_item.release_title,
             'Your share is in your balance and becomes available after the hold period.',
             '/dashboard/music/earnings'
      from public.artist_members m where m.artist_id = v_item.artist_id;
    end if;
  end loop;
  return v_credited;
end;
$$;

/**
 * Brings music credits in line with the order's refunded amount: each line
 * gives back its share proportionally, once. Fully refunded orders lose
 * download access. Server only.
 */
create function public.sync_music_refunds(p_order uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_item record;
  v_target integer;
  v_done integer;
  v_delta integer;
  v_count integer := 0;
begin
  select * into v_order from public.orders where id = p_order for update;
  if not found or v_order.total = 0 or v_order.refunded_amount = 0 then
    return 0;
  end if;

  for v_item in
    select oi.* from public.order_items oi
    where oi.order_id = p_order and oi.music_release_id is not null
      and exists (
        select 1 from public.artist_ledger l
        where l.order_item_id = oi.id and l.entry_type = 'sale'
      )
  loop
    v_target := round(v_item.artist_amount::numeric * least(v_order.refunded_amount, v_order.total) / v_order.total);
    select coalesce(-sum(amount), 0) into v_done
    from public.artist_ledger
    where order_item_id = v_item.id and entry_type = 'refund';
    v_delta := v_target - v_done;
    if v_delta > 0 then
      insert into public.artist_ledger (
        artist_id, entry_type, amount, gross_amount, commission_amount,
        currency, order_id, order_item_id, note
      ) values (
        v_item.artist_id, 'refund', -v_delta,
        -round(v_item.line_total::numeric * v_delta / greatest(v_item.artist_amount, 1)),
        -round(v_item.commission_amount::numeric * v_delta / greatest(v_item.artist_amount, 1)),
        v_order.currency, p_order, v_item.id, 'Refund on ' || v_order.reference
      );
      v_count := v_count + 1;
    end if;
  end loop;

  if v_order.refunded_amount >= v_order.total then
    update public.music_entitlements set revoked_at = coalesce(revoked_at, now())
    where order_id = p_order;
  end if;
  return v_count;
end;
$$;

revoke execute on function public.credit_music_sales(uuid), public.sync_music_refunds(uuid)
  from public, anon, authenticated;

create function public.artist_balance(p_artist uuid)
returns table (
  gross_sales bigint,
  commission bigint,
  net_earnings bigint,
  refunded bigint,
  pending bigint,
  available bigint,
  in_withdrawal bigint,
  withdrawn bigint,
  adjustments bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (
    public.has_permission('finance.manage')
    or exists (select 1 from public.artist_members where artist_id = p_artist and user_id = (select auth.uid()))
  ) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query
  select
    coalesce(sum(l.gross_amount) filter (where l.entry_type = 'sale'), 0)::bigint,
    coalesce(sum(l.commission_amount) filter (where l.entry_type = 'sale'), 0)::bigint,
    coalesce(sum(l.amount) filter (where l.entry_type = 'sale'), 0)::bigint,
    coalesce(-sum(l.amount) filter (where l.entry_type = 'refund'), 0)::bigint,
    coalesce(sum(l.amount) filter (where l.entry_type = 'sale' and l.available_at > now()), 0)::bigint,
    coalesce(sum(l.amount) filter (where l.available_at <= now()), 0)::bigint,
    coalesce((select sum(w.amount) from public.artist_withdrawals w
              where w.artist_id = p_artist and w.status in ('requested', 'approved')), 0)::bigint,
    coalesce((select sum(w.amount) from public.artist_withdrawals w
              where w.artist_id = p_artist and w.status = 'paid'), 0)::bigint,
    coalesce(sum(l.amount) filter (where l.entry_type = 'adjustment'), 0)::bigint
  from public.artist_ledger l
  where l.artist_id = p_artist;
end;
$$;

/** Reserves available funds for a payout. The money moves only when paid. */
create function public.request_withdrawal(p_artist uuid, p_amount integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_available bigint;
  v_min integer := public.music_setting('min_withdrawal', 2000);
  v_id uuid;
begin
  if not exists (select 1 from public.artist_members where artist_id = p_artist and user_id = (select auth.uid())) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  -- One request at a time per artist; serialises concurrent requests.
  perform 1 from public.artists where id = p_artist for update;
  if not exists (select 1 from public.artist_payout_details where artist_id = p_artist) then
    raise exception 'Add your bank details first' using errcode = '22023';
  end if;
  if exists (select 1 from public.artist_withdrawals where artist_id = p_artist and status in ('requested', 'approved')) then
    raise exception 'You already have a withdrawal in progress' using errcode = '22023';
  end if;
  if p_amount is null or p_amount < v_min then
    raise exception 'The minimum withdrawal is % cents', v_min using errcode = '22023';
  end if;
  select coalesce(sum(amount), 0) into v_available
  from public.artist_ledger where artist_id = p_artist and available_at <= now();
  if p_amount > v_available then
    raise exception 'That is more than your available balance' using errcode = '22023';
  end if;

  insert into public.artist_withdrawals (artist_id, amount, requested_by)
  values (p_artist, p_amount, (select auth.uid()))
  returning id into v_id;
  insert into public.artist_ledger (artist_id, entry_type, amount, withdrawal_id, note, created_by)
  values (p_artist, 'withdrawal', -p_amount, v_id, 'Withdrawal requested', (select auth.uid()));
  return v_id;
end;
$$;

create function public.cancel_withdrawal(p_withdrawal uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.artist_withdrawals;
begin
  select * into v_row from public.artist_withdrawals where id = p_withdrawal for update;
  if not found or not exists (
    select 1 from public.artist_members where artist_id = v_row.artist_id and user_id = (select auth.uid())
  ) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if v_row.status <> 'requested' then
    raise exception 'Only requests that are not approved yet can be cancelled' using errcode = '22023';
  end if;
  update public.artist_withdrawals set status = 'cancelled' where id = p_withdrawal;
  insert into public.artist_ledger (artist_id, entry_type, amount, withdrawal_id, note, created_by)
  values (v_row.artist_id, 'withdrawal_release', v_row.amount, p_withdrawal, 'Withdrawal cancelled', (select auth.uid()));
end;
$$;

/** Finance staff approve, mark paid (after the bank transfer) or reject. */
create function public.decide_withdrawal(
  p_withdrawal uuid,
  p_status public.withdrawal_status,
  p_note text default null,
  p_reference text default null
)
returns public.withdrawal_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.artist_withdrawals;
begin
  if not public.has_permission('finance.manage') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select * into v_row from public.artist_withdrawals where id = p_withdrawal for update;
  if not found then
    raise exception 'Withdrawal not found' using errcode = 'P0002';
  end if;
  if not (
    (v_row.status = 'requested' and p_status in ('approved', 'rejected', 'paid'))
    or (v_row.status = 'approved' and p_status in ('paid', 'rejected'))
  ) then
    raise exception 'That change is not possible from %', v_row.status using errcode = '22023';
  end if;
  if p_status = 'paid' and coalesce(trim(p_reference), '') = '' then
    raise exception 'Enter the bank transfer reference' using errcode = '22023';
  end if;
  if p_status = 'rejected' and coalesce(trim(p_note), '') = '' then
    raise exception 'Tell the artist why' using errcode = '22023';
  end if;

  update public.artist_withdrawals
     set status = p_status,
         decided_by = (select auth.uid()),
         decided_at = now(),
         paid_at = case when p_status = 'paid' then now() else paid_at end,
         payout_reference = coalesce(nullif(trim(p_reference), ''), payout_reference),
         admin_note = coalesce(nullif(trim(p_note), ''), admin_note)
   where id = p_withdrawal;

  if p_status = 'rejected' then
    insert into public.artist_ledger (artist_id, entry_type, amount, withdrawal_id, note, created_by)
    values (v_row.artist_id, 'withdrawal_release', v_row.amount, p_withdrawal, 'Withdrawal rejected', (select auth.uid()));
  end if;

  insert into public.notifications (user_id, type, title, body, link)
  select m.user_id, 'music_withdrawal',
         'Withdrawal ' || v_row.reference || ' ' || p_status::text,
         nullif(trim(p_note), ''), '/dashboard/music/earnings'
  from public.artist_members m where m.artist_id = v_row.artist_id;
  return p_status;
end;
$$;

/** Manual correction, e.g. a goodwill credit or a recovered chargeback. */
create function public.add_ledger_adjustment(p_artist uuid, p_amount integer, p_note text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  if not public.has_permission('finance.manage') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_amount is null or p_amount = 0 or abs(p_amount) > 10000000 then
    raise exception 'Enter an amount' using errcode = '22023';
  end if;
  if coalesce(trim(p_note), '') = '' then
    raise exception 'Explain the adjustment' using errcode = '22023';
  end if;
  insert into public.artist_ledger (artist_id, entry_type, amount, note, created_by)
  values (p_artist, 'adjustment', p_amount, trim(p_note), (select auth.uid()))
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.artist_balance(uuid), public.request_withdrawal(uuid, integer),
  public.cancel_withdrawal(uuid),
  public.decide_withdrawal(uuid, public.withdrawal_status, text, text),
  public.add_ledger_adjustment(uuid, integer, text) from public, anon;
grant execute on function public.artist_balance(uuid), public.request_withdrawal(uuid, integer),
  public.cancel_withdrawal(uuid),
  public.decide_withdrawal(uuid, public.withdrawal_status, text, text),
  public.add_ledger_adjustment(uuid, integer, text) to authenticated;

/** Best sellers for the storefront: release ids only, never counts. */
create function public.music_top_selling(p_limit integer default 8)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.release_id
  from public.music_entitlements e
  where e.revoked_at is null and public.is_published_release(e.release_id)
  group by e.release_id
  order by count(*) desc, max(e.granted_at) desc
  limit least(greatest(p_limit, 1), 24);
$$;

revoke execute on function public.music_top_selling(integer) from public;
grant execute on function public.music_top_selling(integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.platform_settings enable row level security;
alter table public.music_genres enable row level security;
alter table public.music_releases enable row level security;
alter table public.music_tracks enable row level security;
alter table public.music_track_files enable row level security;
alter table public.music_bundle_items enable row level security;
alter table public.music_entitlements enable row level security;
alter table public.music_downloads enable row level security;
alter table public.artist_ledger enable row level security;
alter table public.artist_payout_details enable row level security;
alter table public.artist_withdrawals enable row level security;

create policy "platform_settings: read" on public.platform_settings
  for select to anon, authenticated using (true);
create policy "platform_settings: finance writes" on public.platform_settings
  for update to authenticated
  using ((select public.has_permission('finance.manage')))
  with check ((select public.has_permission('finance.manage')));

create policy "music_genres: public read visible" on public.music_genres
  for select to anon, authenticated using (visible);
create policy "music_genres: staff all" on public.music_genres
  for all to authenticated
  using ((select public.has_permission('music.manage')))
  with check ((select public.has_permission('music.manage')));

create policy "music_releases: public read published" on public.music_releases
  for select to anon, authenticated
  using (status = 'published' and (select public.is_published_artist(artist_id)));
create policy "music_releases: members read own" on public.music_releases
  for select to authenticated using ((select public.is_artist_member(artist_id)));
create policy "music_releases: staff read" on public.music_releases
  for select to authenticated using ((select public.has_permission('music.manage')));
create policy "music_releases: members create" on public.music_releases
  for insert to authenticated with check ((select public.is_artist_member(artist_id)));
create policy "music_releases: members update" on public.music_releases
  for update to authenticated
  using ((select public.is_artist_member(artist_id)))
  with check ((select public.is_artist_member(artist_id)));
create policy "music_releases: members delete drafts" on public.music_releases
  for delete to authenticated
  using ((select public.is_artist_member(artist_id)) and status in ('draft', 'rejected'));
create policy "music_releases: staff manage" on public.music_releases
  for all to authenticated
  using ((select public.has_permission('music.manage')))
  with check ((select public.has_permission('music.manage')));

create policy "music_tracks: public read" on public.music_tracks
  for select to anon, authenticated using ((select public.is_published_release(release_id)));
create policy "music_tracks: members read" on public.music_tracks
  for select to authenticated using ((select public.is_release_member(release_id)));
create policy "music_tracks: edit while editable" on public.music_tracks
  for all to authenticated
  using ((select public.is_release_editable(release_id)))
  with check ((select public.is_release_editable(release_id)));
create policy "music_tracks: staff read" on public.music_tracks
  for select to authenticated using ((select public.has_permission('music.manage')));

-- Masters: never public. Buyers download through short signed links.
create policy "music_track_files: members read" on public.music_track_files
  for select to authenticated
  using (exists (select 1 from public.music_tracks t where t.id = track_id and public.is_release_member(t.release_id)));
create policy "music_track_files: staff read" on public.music_track_files
  for select to authenticated using ((select public.has_permission('music.manage')));
create policy "music_track_files: edit while editable" on public.music_track_files
  for all to authenticated
  using (exists (select 1 from public.music_tracks t where t.id = track_id and public.is_release_editable(t.release_id)))
  with check (exists (select 1 from public.music_tracks t where t.id = track_id and public.is_release_editable(t.release_id)));

create policy "music_bundle_items: public read" on public.music_bundle_items
  for select to anon, authenticated using ((select public.is_published_release(bundle_id)));
create policy "music_bundle_items: members read" on public.music_bundle_items
  for select to authenticated using ((select public.is_release_member(bundle_id)));
create policy "music_bundle_items: edit while editable" on public.music_bundle_items
  for all to authenticated
  using ((select public.is_release_editable(bundle_id)))
  with check ((select public.is_release_editable(bundle_id)));

create policy "music_entitlements: buyer read own" on public.music_entitlements
  for select to authenticated using (buyer_id = (select auth.uid()));
create policy "music_entitlements: staff read" on public.music_entitlements
  for select to authenticated using ((select public.has_permission('music.manage')));

create policy "music_downloads: buyer read own" on public.music_downloads
  for select to authenticated using (user_id = (select auth.uid()));
create policy "music_downloads: staff read" on public.music_downloads
  for select to authenticated using ((select public.has_permission('music.manage')));

create policy "artist_ledger: members read own" on public.artist_ledger
  for select to authenticated using ((select public.is_artist_member(artist_id)));
create policy "artist_ledger: finance read" on public.artist_ledger
  for select to authenticated using ((select public.has_permission('finance.manage')));

create policy "artist_payout_details: members manage own" on public.artist_payout_details
  for all to authenticated
  using ((select public.is_artist_member(artist_id)))
  with check ((select public.is_artist_member(artist_id)));
create policy "artist_payout_details: finance read" on public.artist_payout_details
  for select to authenticated using ((select public.has_permission('finance.manage')));

create policy "artist_withdrawals: members read own" on public.artist_withdrawals
  for select to authenticated using ((select public.is_artist_member(artist_id)));
create policy "artist_withdrawals: finance read" on public.artist_withdrawals
  for select to authenticated using ((select public.has_permission('finance.manage')));

-- Artists see the lines of their own music in orders (never buyer details).
create policy "order_items: artists read own music lines" on public.order_items
  for select to authenticated
  using (artist_id is not null and (select public.is_artist_member(artist_id)));

-- Release covers are public once the release is.
drop policy "media_assets: public read" on public.media_assets;
create policy "media_assets: public read" on public.media_assets
  for select to anon, authenticated
  using (
    (artist_id is not null and (select public.is_published_artist(artist_id)))
    or (event_id is not null and (select public.is_published_event(event_id)))
    or (gallery_id is not null and (select public.is_published_gallery(gallery_id)))
    or (video_id is not null and (select public.is_published_video(video_id)))
    or (product_id is not null and (select public.is_public_product(product_id)))
    or (seller_id is not null and (select public.is_approved_seller(seller_id)))
    or (music_release_id is not null and (select public.is_published_release(music_release_id)))
  );
create policy "media_assets: artists manage release covers" on public.media_assets
  for all to authenticated
  using (music_release_id is not null and (select public.is_release_member(music_release_id)))
  with check (music_release_id is not null and (select public.is_release_editable(music_release_id)));

revoke all on public.platform_settings, public.music_genres, public.music_releases,
  public.music_tracks, public.music_bundle_items from anon;
grant select on public.platform_settings, public.music_genres, public.music_releases,
  public.music_tracks, public.music_bundle_items to anon;
revoke all on public.music_track_files, public.music_entitlements, public.music_downloads,
  public.artist_ledger, public.artist_payout_details, public.artist_withdrawals from anon;
grant select, update on public.platform_settings to authenticated;
grant select, insert, update, delete on public.music_genres, public.music_releases,
  public.music_tracks, public.music_track_files, public.music_bundle_items,
  public.artist_payout_details to authenticated;
grant select on public.music_entitlements, public.music_downloads, public.artist_ledger,
  public.artist_withdrawals to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: masters private, previews public, covers in public-media
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'music-masters', 'music-masters', false, 52428800,
  array['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/flac', 'audio/x-flac',
        'audio/mpeg', 'audio/mp3', 'audio/aiff', 'audio/x-aiff']
), (
  'music-previews', 'music-previews', true, 15728640,
  array['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/webm']
);

-- Paths are "releases/<release id>/<file>".
create policy "music-masters: members read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'music-masters' and (storage.foldername(name))[1] = 'releases'
         and public.is_release_member(public.storage_owner_id(name)));
create policy "music-masters: members write while editable" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'music-masters' and (storage.foldername(name))[1] = 'releases'
              and public.is_release_editable(public.storage_owner_id(name)));
create policy "music-masters: members delete while editable" on storage.objects
  for delete to authenticated
  using (bucket_id = 'music-masters' and (storage.foldername(name))[1] = 'releases'
         and public.is_release_editable(public.storage_owner_id(name)));
create policy "music-masters: staff read" on storage.objects
  for select to authenticated
  using (bucket_id = 'music-masters' and (select public.has_permission('music.manage')));

create policy "music-previews: members write while editable" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'music-previews' and (storage.foldername(name))[1] = 'releases'
              and public.is_release_editable(public.storage_owner_id(name)));
create policy "music-previews: members delete while editable" on storage.objects
  for delete to authenticated
  using (bucket_id = 'music-previews' and (storage.foldername(name))[1] = 'releases'
         and public.is_release_editable(public.storage_owner_id(name)));
create policy "music-previews: members read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'music-previews' and (storage.foldername(name))[1] = 'releases'
         and public.is_release_member(public.storage_owner_id(name)));

create policy "public-media: artists upload release covers" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'public-media' and (storage.foldername(name))[1] = 'music'
              and public.is_release_editable(public.storage_owner_id(name)));
create policy "public-media: artists manage release covers" on storage.objects
  for select to authenticated
  using (bucket_id = 'public-media' and (storage.foldername(name))[1] = 'music'
         and public.is_release_member(public.storage_owner_id(name)));
create policy "public-media: artists delete release covers" on storage.objects
  for delete to authenticated
  using (bucket_id = 'public-media' and (storage.foldername(name))[1] = 'music'
         and public.is_release_editable(public.storage_owner_id(name)));

-- ---------------------------------------------------------------------------
-- Audit
-- ---------------------------------------------------------------------------

create trigger audit_music_releases after insert or update or delete on public.music_releases
for each row execute function public.audit_row();
create trigger audit_music_genres after insert or update or delete on public.music_genres
for each row execute function public.audit_row();
create trigger audit_platform_settings after insert or update or delete on public.platform_settings
for each row execute function public.audit_row();
create trigger audit_artist_withdrawals after insert or update or delete on public.artist_withdrawals
for each row execute function public.audit_row();
create trigger audit_artist_payout_details after insert or update or delete on public.artist_payout_details
for each row execute function public.audit_row();
create trigger audit_artist_ledger after insert on public.artist_ledger
for each row execute function public.audit_row();

revoke execute on function public.guard_music_release(), public.check_bundle_item()
  from public, anon, authenticated;
