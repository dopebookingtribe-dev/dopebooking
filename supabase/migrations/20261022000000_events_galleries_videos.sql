-- Phase 04: events, lineups, photo galleries and videos.
-- See docs/PROJECT_ARCHITECTURE.md §5.3.

create type public.video_provider as enum (
  'cloudflare_stream', 'mux', 'youtube', 'vimeo'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title text not null check (char_length(title) between 1 and 160),
  summary text check (char_length(summary) <= 200),
  description text check (char_length(description) <= 8000),
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'Europe/Berlin'
    check (char_length(timezone) <= 64),
  venue_name text check (char_length(venue_name) <= 160),
  city text check (char_length(city) <= 80),
  country text check (country ~ '^[A-Z]{2}$'),
  ticket_url text check (ticket_url ~ '^https://' and char_length(ticket_url) <= 500),
  status public.content_status not null default 'draft',
  featured boolean not null default false,
  cover_asset_id uuid,
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create index events_public_idx on public.events (status, starts_at);

create table public.event_artists (
  event_id uuid not null references public.events (id) on delete cascade,
  artist_id uuid not null references public.artists (id) on delete cascade,
  stage text check (char_length(stage) <= 80),
  set_starts_at timestamptz,
  sort_order integer not null default 0,
  primary key (event_id, artist_id)
);

create index event_artists_artist_idx on public.event_artists (artist_id);

create table public.galleries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title text not null check (char_length(title) between 1 and 160),
  description text check (char_length(description) <= 4000),
  event_id uuid references public.events (id) on delete set null,
  photographer text check (char_length(photographer) <= 120),
  status public.content_status not null default 'draft',
  cover_asset_id uuid,
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index galleries_public_idx on public.galleries (status, published_at desc);
create index galleries_event_idx on public.galleries (event_id);

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title text not null check (char_length(title) between 1 and 160),
  description text check (char_length(description) <= 4000),
  provider public.video_provider not null,
  -- Provider id; for Cloudflare Stream "customer-<code>/<video id>".
  provider_ref text not null
    check (provider_ref ~ '^[A-Za-z0-9_-]+(/[A-Za-z0-9_-]+)?$' and char_length(provider_ref) <= 200),
  event_id uuid references public.events (id) on delete set null,
  artist_id uuid references public.artists (id) on delete set null,
  status public.content_status not null default 'draft',
  featured boolean not null default false,
  poster_asset_id uuid,
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_ref)
);

create index videos_public_idx on public.videos (status, published_at desc);

-- media_assets: events, galleries and videos can own images too.
alter table public.media_assets
  add column event_id uuid references public.events (id) on delete cascade,
  add column gallery_id uuid references public.galleries (id) on delete cascade,
  add column video_id uuid references public.videos (id) on delete cascade;

alter table public.media_assets drop constraint media_assets_one_owner;
alter table public.media_assets add constraint media_assets_one_owner
  check (num_nonnulls(artist_id, event_id, gallery_id, video_id) = 1);

create index media_assets_event_idx on public.media_assets (event_id);
create index media_assets_gallery_idx on public.media_assets (gallery_id, sort_order);
create index media_assets_video_idx on public.media_assets (video_id);

alter table public.events add constraint events_cover_fk
  foreign key (cover_asset_id) references public.media_assets (id) on delete set null;
alter table public.galleries add constraint galleries_cover_fk
  foreign key (cover_asset_id) references public.media_assets (id) on delete set null;
alter table public.videos add constraint videos_poster_fk
  foreign key (poster_asset_id) references public.media_assets (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger events_set_updated_at before update on public.events
for each row execute function public.set_updated_at();
create trigger galleries_set_updated_at before update on public.galleries
for each row execute function public.set_updated_at();
create trigger videos_set_updated_at before update on public.videos
for each row execute function public.set_updated_at();

create trigger events_set_published_at
before insert or update of status on public.events
for each row execute function public.set_published_at();
create trigger galleries_set_published_at
before insert or update of status on public.galleries
for each row execute function public.set_published_at();
create trigger videos_set_published_at
before insert or update of status on public.videos
for each row execute function public.set_published_at();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function public.is_published_event(target uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.events where id = target and status = 'published');
$$;

create function public.is_published_gallery(target uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.galleries where id = target and status = 'published');
$$;

create function public.is_published_video(target uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.videos where id = target and status = 'published');
$$;

revoke execute on function
  public.is_published_event(uuid), public.is_published_gallery(uuid),
  public.is_published_video(uuid)
  from public;
grant execute on function
  public.is_published_event(uuid), public.is_published_gallery(uuid),
  public.is_published_video(uuid)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.events enable row level security;
alter table public.event_artists enable row level security;
alter table public.galleries enable row level security;
alter table public.videos enable row level security;

create policy "events: public read published" on public.events
  for select to anon, authenticated using (status = 'published');
create policy "events: staff all" on public.events
  for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- Lineup rows are public only when both the event and the artist are.
create policy "event_artists: public read" on public.event_artists
  for select to anon, authenticated
  using (
    (select public.is_published_event(event_id))
    and (select public.is_published_artist(artist_id))
  );
create policy "event_artists: staff all" on public.event_artists
  for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "galleries: public read published" on public.galleries
  for select to anon, authenticated using (status = 'published');
create policy "galleries: staff all" on public.galleries
  for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "videos: public read published" on public.videos
  for select to anon, authenticated using (status = 'published');
create policy "videos: staff all" on public.videos
  for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- media_assets public read now covers every owner type.
drop policy "media_assets: public read" on public.media_assets;
create policy "media_assets: public read" on public.media_assets
  for select to anon, authenticated
  using (
    (artist_id is not null and (select public.is_published_artist(artist_id)))
    or (event_id is not null and (select public.is_published_event(event_id)))
    or (gallery_id is not null and (select public.is_published_gallery(gallery_id)))
    or (video_id is not null and (select public.is_published_video(video_id)))
  );

revoke all on public.events, public.event_artists, public.galleries, public.videos from anon;
grant select on public.events, public.event_artists, public.galleries, public.videos to anon;
grant select, insert, update, delete on
  public.events, public.event_artists, public.galleries, public.videos
  to authenticated;
