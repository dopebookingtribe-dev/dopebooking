-- Phase 12: Art Gallery. Visual artists and collectives, exhibitions at
-- festivals, artworks with shared credits, exhibition photography, partners
-- and videos. Collaboration inquiries are service requests of type
-- 'art_gallery' (previous migration).
--
-- One profile per artist, reused everywhere:
--   art_artists ──< art_exhibition_artists >── art_exhibitions >── art_festivals
--        │                (roles per show)          │
--        ├──< art_artwork_credits >── art_artworks ─┴──< art_exhibition_artworks
--        └──< art_collective_members (collectives list their members)
-- Images live in media_assets like every other image on the site.
--
-- Additive only: no existing table loses data. Safe to apply on a live site.

-- ---------------------------------------------------------------------------
-- Fixed lists (keep in sync with src/modules/art/schemas.ts)
-- ---------------------------------------------------------------------------

create function public.valid_art_disciplines(items text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select items <@ array[
    'painting', 'sculpture', 'installation', 'visionary', 'psychedelic',
    'digital', 'live_painting', 'multimedia', 'photography', 'textile',
    'light', 'mural', 'projection'
  ]::text[];
$$;

create function public.valid_art_roles(items text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select items <@ array[
    'curator', 'featured', 'artist', 'installation', 'live_painter',
    'collaborator', 'guest', 'technical'
  ]::text[];
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.art_artists (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  -- Full artistic name; stage_name is an optional alias shown beside it.
  name text not null check (char_length(name) between 1 and 120),
  stage_name text check (char_length(stage_name) <= 120),
  kind text not null default 'individual'
    check (kind in ('individual', 'collective')),
  tagline text check (char_length(tagline) <= 160),
  disciplines text[] not null default '{}'
    check (cardinality(disciplines) <= 8 and public.valid_art_disciplines(disciplines)),
  specialization text check (char_length(specialization) <= 160),
  country text check (country ~ '^[A-Z]{2}$'),
  based_in text check (char_length(based_in) <= 80),
  bio text check (char_length(bio) <= 8000),
  statement text check (char_length(statement) <= 3000),
  techniques text check (char_length(techniques) <= 2000),
  website_url text check (website_url ~ '^https://' and char_length(website_url) <= 500),
  inquiries_enabled boolean not null default true,
  -- Same person on the music roster (DJ who also paints): linked, not copied.
  music_artist_id uuid references public.artists (id) on delete set null,
  portrait_asset_id uuid,
  cover_asset_id uuid,
  status public.content_status not null default 'draft',
  featured boolean not null default false,
  sort_order integer not null default 0,
  is_demo boolean not null default false,
  seo_title text check (char_length(seo_title) <= 70),
  seo_description text check (char_length(seo_description) <= 200),
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index art_artists_public_idx
  on public.art_artists (status, featured desc, sort_order, name);
create index art_artists_music_idx on public.art_artists (music_artist_id);

create table public.art_artist_links (
  id uuid primary key default gen_random_uuid(),
  art_artist_id uuid not null references public.art_artists (id) on delete cascade,
  platform text not null check (platform in (
    'website', 'instagram', 'facebook', 'youtube', 'vimeo', 'tiktok',
    'behance', 'artstation', 'x', 'linkedin', 'other'
  )),
  url text not null check (url ~ '^https://' and char_length(url) <= 500),
  sort_order integer not null default 0,
  unique (art_artist_id, url)
);

create index art_artist_links_idx on public.art_artist_links (art_artist_id, sort_order);

-- A collective is an art_artists row of kind 'collective'; its members are
-- individual profiles, so nobody is entered twice.
create table public.art_collective_members (
  collective_id uuid not null references public.art_artists (id) on delete cascade,
  member_id uuid not null references public.art_artists (id) on delete cascade,
  note text check (char_length(note) <= 80),
  sort_order integer not null default 0,
  primary key (collective_id, member_id),
  check (collective_id <> member_id)
);

create index art_collective_members_member_idx on public.art_collective_members (member_id);

create table public.art_festivals (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  name text not null check (char_length(name) between 1 and 160),
  city text check (char_length(city) <= 80),
  country text check (country ~ '^[A-Z]{2}$'),
  website_url text check (website_url ~ '^https://' and char_length(website_url) <= 500),
  description text check (char_length(description) <= 2000),
  sort_order integer not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.art_exhibitions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title text not null check (char_length(title) between 1 and 160),
  subtitle text check (char_length(subtitle) <= 200),
  festival_id uuid references public.art_festivals (id) on delete set null,
  -- Optional link to a DopeBooking event page (lineup, tickets).
  event_id uuid references public.events (id) on delete set null,
  venue_name text check (char_length(venue_name) <= 160),
  city text check (char_length(city) <= 80),
  country text check (country ~ '^[A-Z]{2}$'),
  -- Calendar dates in the festival's own place; empty start = dates TBA.
  starts_on date,
  ends_on date,
  date_note text check (char_length(date_note) <= 80),
  summary text check (char_length(summary) <= 300),
  overview text check (char_length(overview) <= 8000),
  concept text check (char_length(concept) <= 4000),
  -- Visual identity: a decorative accent (lines, dots), never text colour.
  accent_color text check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  external_url text check (external_url ~ '^https://' and char_length(external_url) <= 500),
  cover_asset_id uuid,
  mobile_cover_asset_id uuid,
  status public.content_status not null default 'draft',
  featured boolean not null default false,
  sort_order integer not null default 0,
  is_demo boolean not null default false,
  seo_title text check (char_length(seo_title) <= 70),
  seo_description text check (char_length(seo_description) <= 200),
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or (starts_on is not null and ends_on >= starts_on))
);

create index art_exhibitions_public_idx
  on public.art_exhibitions (status, featured desc, sort_order, starts_on desc);
create index art_exhibitions_festival_idx on public.art_exhibitions (festival_id);
create index art_exhibitions_event_idx on public.art_exhibitions (event_id);

-- Who took part, with roles for this show only (curator, live painter…).
create table public.art_exhibition_artists (
  exhibition_id uuid not null references public.art_exhibitions (id) on delete cascade,
  art_artist_id uuid not null references public.art_artists (id) on delete cascade,
  roles text[] not null default '{artist}'
    check (cardinality(roles) between 1 and 4 and public.valid_art_roles(roles)),
  note text check (char_length(note) <= 200),
  sort_order integer not null default 0,
  primary key (exhibition_id, art_artist_id)
);

create index art_exhibition_artists_artist_idx on public.art_exhibition_artists (art_artist_id);

create table public.art_artworks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title text not null check (char_length(title) between 1 and 160),
  year smallint check (year between 1900 and 2100),
  discipline text check (discipline is null or public.valid_art_disciplines(array[discipline])),
  medium text check (char_length(medium) <= 160),
  width_cm numeric(7, 1) check (width_cm > 0),
  height_cm numeric(7, 1) check (height_cm > 0),
  depth_cm numeric(7, 1) check (depth_cm > 0),
  dimensions_note text check (char_length(dimensions_note) <= 120),
  description text check (char_length(description) <= 4000),
  image_asset_id uuid,
  status public.content_status not null default 'draft',
  featured boolean not null default false,
  sort_order integer not null default 0,
  is_demo boolean not null default false,
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index art_artworks_public_idx
  on public.art_artworks (status, featured desc, sort_order, year desc);

-- One or more creators per work; collaborative pieces credit everyone.
create table public.art_artwork_credits (
  artwork_id uuid not null references public.art_artworks (id) on delete cascade,
  art_artist_id uuid not null references public.art_artists (id) on delete cascade,
  credit text check (char_length(credit) <= 80),
  sort_order integer not null default 0,
  primary key (artwork_id, art_artist_id)
);

create index art_artwork_credits_artist_idx on public.art_artwork_credits (art_artist_id);

-- A work can travel: shown at several exhibitions.
create table public.art_exhibition_artworks (
  exhibition_id uuid not null references public.art_exhibitions (id) on delete cascade,
  artwork_id uuid not null references public.art_artworks (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (exhibition_id, artwork_id)
);

create index art_exhibition_artworks_artwork_idx on public.art_exhibition_artworks (artwork_id);

create table public.art_exhibition_partners (
  id uuid primary key default gen_random_uuid(),
  exhibition_id uuid not null references public.art_exhibitions (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  kind text not null default 'partner'
    check (kind in ('partner', 'sponsor', 'supporter', 'media')),
  url text check (url ~ '^https://' and char_length(url) <= 500),
  logo_asset_id uuid,
  sort_order integer not null default 0
);

create index art_exhibition_partners_idx on public.art_exhibition_partners (exhibition_id, sort_order);

-- ---------------------------------------------------------------------------
-- Images and videos: new owners on the shared tables
-- ---------------------------------------------------------------------------

alter table public.media_assets
  add column art_artist_id uuid references public.art_artists (id) on delete cascade,
  add column art_exhibition_id uuid references public.art_exhibitions (id) on delete cascade,
  add column art_artwork_id uuid references public.art_artworks (id) on delete cascade,
  -- Curated sets for exhibition photography.
  add column art_collection text check (art_collection in (
    'installation', 'closeup', 'atmosphere', 'process', 'logo'
  ));

alter table public.media_assets drop constraint media_assets_one_owner;
alter table public.media_assets add constraint media_assets_one_owner
  check (num_nonnulls(
    artist_id, event_id, gallery_id, video_id, product_id, seller_id, library,
    music_release_id, art_artist_id, art_exhibition_id, art_artwork_id
  ) = 1);

create index media_assets_art_artist_idx on public.media_assets (art_artist_id, sort_order);
create index media_assets_art_exhibition_idx on public.media_assets (art_exhibition_id, sort_order);
create index media_assets_art_artwork_idx on public.media_assets (art_artwork_id, sort_order);

alter table public.art_artists
  add constraint art_artists_portrait_fk foreign key (portrait_asset_id)
    references public.media_assets (id) on delete set null,
  add constraint art_artists_cover_fk foreign key (cover_asset_id)
    references public.media_assets (id) on delete set null;
alter table public.art_exhibitions
  add constraint art_exhibitions_cover_fk foreign key (cover_asset_id)
    references public.media_assets (id) on delete set null,
  add constraint art_exhibitions_mobile_cover_fk foreign key (mobile_cover_asset_id)
    references public.media_assets (id) on delete set null;
alter table public.art_artworks
  add constraint art_artworks_image_fk foreign key (image_asset_id)
    references public.media_assets (id) on delete set null;
alter table public.art_exhibition_partners
  add constraint art_exhibition_partners_logo_fk foreign key (logo_asset_id)
    references public.media_assets (id) on delete set null;

-- Videos (any supported provider link) can belong to an art profile or show.
alter table public.videos
  add column art_artist_id uuid references public.art_artists (id) on delete set null,
  add column art_exhibition_id uuid references public.art_exhibitions (id) on delete set null;

create index videos_art_artist_idx on public.videos (art_artist_id);
create index videos_art_exhibition_idx on public.videos (art_exhibition_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger art_artists_set_updated_at before update on public.art_artists
for each row execute function public.set_updated_at();
create trigger art_festivals_set_updated_at before update on public.art_festivals
for each row execute function public.set_updated_at();
create trigger art_exhibitions_set_updated_at before update on public.art_exhibitions
for each row execute function public.set_updated_at();
create trigger art_artworks_set_updated_at before update on public.art_artworks
for each row execute function public.set_updated_at();

create trigger art_artists_set_published_at
before insert or update of status on public.art_artists
for each row execute function public.set_published_at();
create trigger art_exhibitions_set_published_at
before insert or update of status on public.art_exhibitions
for each row execute function public.set_published_at();
create trigger art_artworks_set_published_at
before insert or update of status on public.art_artworks
for each row execute function public.set_published_at();

-- Collectives contain individuals only (no nesting, no loops).
create function public.guard_art_collective_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.art_artists where id = new.collective_id and kind = 'collective'
  ) then
    raise exception 'Members can only be added to a collective' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.art_artists where id = new.member_id and kind = 'individual'
  ) then
    raise exception 'A collective can only list individual artists' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger art_collective_members_guard
before insert or update on public.art_collective_members
for each row execute function public.guard_art_collective_member();

-- A collective with members can't turn into an individual (and back).
create function public.guard_art_artist_kind()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind is distinct from old.kind and (
    exists (select 1 from public.art_collective_members where collective_id = new.id)
    or exists (select 1 from public.art_collective_members where member_id = new.id)
  ) then
    raise exception 'Remove collective members before changing the profile type'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger art_artists_guard_kind
before update of kind on public.art_artists
for each row execute function public.guard_art_artist_kind();

revoke execute on function
  public.guard_art_collective_member(), public.guard_art_artist_kind()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Helpers for public reads
-- ---------------------------------------------------------------------------

create function public.is_published_art_artist(target uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.art_artists where id = target and status = 'published');
$$;

create function public.is_published_art_exhibition(target uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.art_exhibitions where id = target and status = 'published');
$$;

create function public.is_published_art_artwork(target uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.art_artworks where id = target and status = 'published');
$$;

-- Festivals are public once a published exhibition names them.
create function public.is_public_art_festival(target uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.art_exhibitions
    where festival_id = target and status = 'published'
  );
$$;

revoke execute on function
  public.is_published_art_artist(uuid), public.is_published_art_exhibition(uuid),
  public.is_published_art_artwork(uuid), public.is_public_art_festival(uuid)
  from public;
grant execute on function
  public.is_published_art_artist(uuid), public.is_published_art_exhibition(uuid),
  public.is_published_art_artwork(uuid), public.is_public_art_festival(uuid)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security: the public sees published rows; content.manage edits
-- ---------------------------------------------------------------------------

alter table public.art_artists enable row level security;
alter table public.art_artist_links enable row level security;
alter table public.art_collective_members enable row level security;
alter table public.art_festivals enable row level security;
alter table public.art_exhibitions enable row level security;
alter table public.art_exhibition_artists enable row level security;
alter table public.art_artworks enable row level security;
alter table public.art_artwork_credits enable row level security;
alter table public.art_exhibition_artworks enable row level security;
alter table public.art_exhibition_partners enable row level security;

create policy "art_artists: public read published" on public.art_artists
  for select to anon, authenticated using (status = 'published');
create policy "art_artists: editors all" on public.art_artists
  for all to authenticated
  using ((select public.has_permission('content.manage')))
  with check ((select public.has_permission('content.manage')));

create policy "art_artist_links: public read" on public.art_artist_links
  for select to anon, authenticated
  using ((select public.is_published_art_artist(art_artist_id)));
create policy "art_artist_links: editors all" on public.art_artist_links
  for all to authenticated
  using ((select public.has_permission('content.manage')))
  with check ((select public.has_permission('content.manage')));

create policy "art_collective_members: public read" on public.art_collective_members
  for select to anon, authenticated
  using (
    (select public.is_published_art_artist(collective_id))
    and (select public.is_published_art_artist(member_id))
  );
create policy "art_collective_members: editors all" on public.art_collective_members
  for all to authenticated
  using ((select public.has_permission('content.manage')))
  with check ((select public.has_permission('content.manage')));

create policy "art_festivals: public read" on public.art_festivals
  for select to anon, authenticated
  using ((select public.is_public_art_festival(id)));
create policy "art_festivals: editors all" on public.art_festivals
  for all to authenticated
  using ((select public.has_permission('content.manage')))
  with check ((select public.has_permission('content.manage')));

create policy "art_exhibitions: public read published" on public.art_exhibitions
  for select to anon, authenticated using (status = 'published');
create policy "art_exhibitions: editors all" on public.art_exhibitions
  for all to authenticated
  using ((select public.has_permission('content.manage')))
  with check ((select public.has_permission('content.manage')));

create policy "art_exhibition_artists: public read" on public.art_exhibition_artists
  for select to anon, authenticated
  using (
    (select public.is_published_art_exhibition(exhibition_id))
    and (select public.is_published_art_artist(art_artist_id))
  );
create policy "art_exhibition_artists: editors all" on public.art_exhibition_artists
  for all to authenticated
  using ((select public.has_permission('content.manage')))
  with check ((select public.has_permission('content.manage')));

create policy "art_artworks: public read published" on public.art_artworks
  for select to anon, authenticated using (status = 'published');
create policy "art_artworks: editors all" on public.art_artworks
  for all to authenticated
  using ((select public.has_permission('content.manage')))
  with check ((select public.has_permission('content.manage')));

create policy "art_artwork_credits: public read" on public.art_artwork_credits
  for select to anon, authenticated
  using (
    (select public.is_published_art_artwork(artwork_id))
    and (select public.is_published_art_artist(art_artist_id))
  );
create policy "art_artwork_credits: editors all" on public.art_artwork_credits
  for all to authenticated
  using ((select public.has_permission('content.manage')))
  with check ((select public.has_permission('content.manage')));

create policy "art_exhibition_artworks: public read" on public.art_exhibition_artworks
  for select to anon, authenticated
  using (
    (select public.is_published_art_exhibition(exhibition_id))
    and (select public.is_published_art_artwork(artwork_id))
  );
create policy "art_exhibition_artworks: editors all" on public.art_exhibition_artworks
  for all to authenticated
  using ((select public.has_permission('content.manage')))
  with check ((select public.has_permission('content.manage')));

create policy "art_exhibition_partners: public read" on public.art_exhibition_partners
  for select to anon, authenticated
  using ((select public.is_published_art_exhibition(exhibition_id)));
create policy "art_exhibition_partners: editors all" on public.art_exhibition_partners
  for all to authenticated
  using ((select public.has_permission('content.manage')))
  with check ((select public.has_permission('content.manage')));

-- media_assets: art images are public once their owner is.
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
    or (art_artist_id is not null and (select public.is_published_art_artist(art_artist_id)))
    or (art_exhibition_id is not null and (select public.is_published_art_exhibition(art_exhibition_id)))
    or (art_artwork_id is not null and (select public.is_published_art_artwork(art_artwork_id)))
  );

-- Grants. Visitors read public columns only (never created_by), matching
-- the security hardening migration.
revoke all on public.art_artists, public.art_artist_links,
  public.art_collective_members, public.art_festivals, public.art_exhibitions,
  public.art_exhibition_artists, public.art_artworks, public.art_artwork_credits,
  public.art_exhibition_artworks, public.art_exhibition_partners
  from anon;

grant select (
  id, slug, name, stage_name, kind, tagline, disciplines, specialization,
  country, based_in, bio, statement, techniques, website_url,
  inquiries_enabled, music_artist_id, portrait_asset_id, cover_asset_id,
  status, featured, sort_order, is_demo, seo_title, seo_description,
  published_at, created_at, updated_at
) on public.art_artists to anon;

grant select (
  id, slug, title, subtitle, festival_id, event_id, venue_name, city, country,
  starts_on, ends_on, date_note, summary, overview, concept, accent_color,
  external_url, cover_asset_id, mobile_cover_asset_id, status, featured,
  sort_order, is_demo, seo_title, seo_description, published_at, created_at,
  updated_at
) on public.art_exhibitions to anon;

grant select (
  id, slug, title, year, discipline, medium, width_cm, height_cm, depth_cm,
  dimensions_note, description, image_asset_id, status, featured, sort_order,
  is_demo, published_at, created_at, updated_at
) on public.art_artworks to anon;

grant select on public.art_artist_links, public.art_collective_members,
  public.art_festivals, public.art_exhibition_artists,
  public.art_artwork_credits, public.art_exhibition_artworks,
  public.art_exhibition_partners
  to anon;

grant select, insert, update, delete on public.art_artists,
  public.art_artist_links, public.art_collective_members, public.art_festivals,
  public.art_exhibitions, public.art_exhibition_artists, public.art_artworks,
  public.art_artwork_credits, public.art_exhibition_artworks,
  public.art_exhibition_partners
  to authenticated;

grant select (art_artist_id, art_exhibition_id, art_artwork_id, art_collection)
  on public.media_assets to anon;
grant select (art_artist_id, art_exhibition_id) on public.videos to anon;

-- ---------------------------------------------------------------------------
-- Collaboration inquiries: label for notifications and emails
-- ---------------------------------------------------------------------------

create or replace function public.service_label(t public.service_type)
returns text language sql immutable set search_path = ''
as $$
  select case t
    when 'promotion' then 'Event promotion'
    when 'catering' then 'Festival catering'
    when 'photography' then 'Photography'
    when 'videography' then 'Videography'
    when 'aftermovie' then 'Aftermovie'
    when 'art_gallery' then 'Art gallery collaboration'
  end;
$$;

-- ---------------------------------------------------------------------------
-- Demo content removal now covers the Art Gallery
-- ---------------------------------------------------------------------------

create or replace function public.delete_demo_content()
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_paths text[];
begin
  if not public.has_permission('demo.manage') then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  create temp table demo_media on commit drop as
  select m.id, m.storage_path
  from public.media_assets m
  where m.is_demo
     or m.artist_id in (select id from public.artists where is_demo)
     or m.event_id in (select id from public.events where is_demo)
     or m.gallery_id in (select id from public.galleries where is_demo)
     or m.video_id in (select id from public.videos where is_demo)
     or m.product_id in (select id from public.products where is_demo)
     or m.seller_id in (select id from public.sellers where is_demo)
     or m.art_artist_id in (select id from public.art_artists where is_demo)
     or m.art_exhibition_id in (select id from public.art_exhibitions where is_demo)
     or m.art_artwork_id in (select id from public.art_artworks where is_demo);

  -- Art Gallery first: its rows only point at artists, events and media.
  delete from public.art_artworks where is_demo;
  delete from public.art_exhibitions where is_demo;
  delete from public.art_artists where is_demo;
  delete from public.art_festivals f
   where f.is_demo
     and not exists (select 1 from public.art_exhibitions e where e.festival_id = f.id);

  -- Orders keep their history: demo products with orders are archived instead.
  update public.products set status = 'archived'
   where is_demo and id in (select product_id from public.order_items where product_id is not null);
  delete from public.products p
   where p.is_demo and not exists (select 1 from public.order_items oi where oi.product_id = p.id);
  delete from public.videos where is_demo;
  delete from public.galleries where is_demo;
  delete from public.events where is_demo;
  -- Artists with booking requests keep them: archived instead of deleted.
  update public.artists set status = 'archived'
   where is_demo and id in (select artist_id from public.booking_requests);
  delete from public.artists a
   where a.is_demo and not exists (select 1 from public.booking_requests b where b.artist_id = a.id);
  delete from public.product_categories where is_demo;
  delete from public.sellers s
   where s.is_demo
     and not exists (select 1 from public.products p where p.seller_id = s.id)
     and not exists (select 1 from public.seller_orders so where so.seller_id = s.id);
  -- Library images only; owned images went with their owner above.
  delete from public.media_assets where is_demo and library is not null;

  -- Only files whose records are really gone; archived rows keep theirs.
  select coalesce(array_agg(d.storage_path), '{}') into v_paths
  from pg_temp.demo_media d
  where not exists (select 1 from public.media_assets m where m.id = d.id);
  drop table pg_temp.demo_media;
  return v_paths;
end;
$$;

revoke execute on function public.delete_demo_content() from public, anon;
grant execute on function public.delete_demo_content() to authenticated;

-- ---------------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------------

create trigger audit_art_artists after insert or update or delete on public.art_artists
for each row execute function public.audit_row();
create trigger audit_art_festivals after insert or update or delete on public.art_festivals
for each row execute function public.audit_row();
create trigger audit_art_exhibitions after insert or update or delete on public.art_exhibitions
for each row execute function public.audit_row();
create trigger audit_art_artworks after insert or update or delete on public.art_artworks
for each row execute function public.audit_row();
create trigger audit_art_exhibition_partners after insert or update or delete on public.art_exhibition_partners
for each row execute function public.audit_row();
