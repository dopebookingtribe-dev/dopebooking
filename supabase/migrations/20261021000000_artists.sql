-- Phase 03: artists, private booking info, links, media and storage.
-- See docs/PROJECT_ARCHITECTURE.md §5.2 and §5.9.

create type public.content_status as enum ('draft', 'published', 'archived');
create type public.artist_member_role as enum ('owner', 'manager');
create type public.media_type as enum ('image');
create type public.link_platform as enum (
  'website', 'instagram', 'soundcloud', 'spotify', 'beatport', 'bandcamp',
  'youtube', 'facebook', 'resident_advisor', 'other'
);

-- Keep in sync with GENRES in src/modules/artists/schemas.ts.
create function public.valid_genres(genres text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select genres <@ array[
    'progressive', 'full-on', 'psychedelic', 'goa', 'dark', 'forest',
    'hi-tech', 'twilight', 'zenonesque', 'psy-techno', 'psybient', 'minimal'
  ]::text[];
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.artists (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  stage_name text not null check (char_length(stage_name) between 1 and 120),
  tagline text check (char_length(tagline) <= 160),
  bio text check (char_length(bio) <= 6000),
  country text check (country ~ '^[A-Z]{2}$'),
  based_in text check (char_length(based_in) <= 80),
  genres text[] not null default '{}'
    check (cardinality(genres) <= 6 and public.valid_genres(genres)),
  status public.content_status not null default 'draft',
  featured boolean not null default false,
  sort_order integer not null default 0,
  portrait_asset_id uuid,
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index artists_public_idx on public.artists (status, featured desc, sort_order, stage_name);

create table public.artist_members (
  artist_id uuid not null references public.artists (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  member_role public.artist_member_role not null default 'manager',
  created_at timestamptz not null default now(),
  primary key (artist_id, user_id)
);

create index artist_members_user_idx on public.artist_members (user_id);

-- Private: never readable by the public.
create table public.artist_private (
  artist_id uuid primary key references public.artists (id) on delete cascade,
  fee_min integer check (fee_min >= 0),
  fee_max integer check (fee_max >= 0),
  fee_currency text not null default 'EUR' check (fee_currency ~ '^[A-Z]{3}$'),
  booking_email text check (char_length(booking_email) <= 254),
  technical_rider_path text,
  hospitality_rider_path text,
  internal_notes text check (char_length(internal_notes) <= 6000),
  updated_at timestamptz not null default now(),
  check (fee_min is null or fee_max is null or fee_min <= fee_max)
);

create table public.artist_links (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  platform public.link_platform not null,
  url text not null check (url ~ '^https://' and char_length(url) <= 500),
  sort_order integer not null default 0,
  unique (artist_id, url)
);

create index artist_links_artist_idx on public.artist_links (artist_id, sort_order);

-- One owner per asset; later phases add gallery_id, product_id, provider_id
-- and widen the owner check.
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references public.artists (id) on delete cascade,
  type public.media_type not null default 'image',
  storage_bucket text not null default 'public-media',
  storage_path text not null unique,
  alt_text text not null check (char_length(alt_text) between 1 and 300),
  credit text check (char_length(credit) <= 120),
  width integer check (width > 0),
  height integer check (height > 0),
  sort_order integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint media_assets_one_owner check (num_nonnulls(artist_id) = 1)
);

create index media_assets_artist_idx on public.media_assets (artist_id, sort_order);

alter table public.artists
  add constraint artists_portrait_fk
  foreign key (portrait_asset_id) references public.media_assets (id)
  on delete set null;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger artists_set_updated_at
before update on public.artists
for each row execute function public.set_updated_at();

create trigger artist_private_set_updated_at
before update on public.artist_private
for each row execute function public.set_updated_at();

create function public.set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end;
$$;

create trigger artists_set_published_at
before insert or update of status on public.artists
for each row execute function public.set_published_at();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function public.is_artist_member(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.artist_members
    where artist_id = target and user_id = (select auth.uid())
  );
$$;

create function public.is_published_artist(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.artists where id = target and status = 'published'
  );
$$;

revoke execute on function public.is_artist_member(uuid) from public, anon;
grant execute on function public.is_artist_member(uuid) to authenticated;
revoke execute on function public.is_published_artist(uuid) from public;
grant execute on function public.is_published_artist(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.artists enable row level security;
alter table public.artist_members enable row level security;
alter table public.artist_private enable row level security;
alter table public.artist_links enable row level security;
alter table public.media_assets enable row level security;

-- artists
create policy "artists: public read published"
  on public.artists for select to anon, authenticated
  using (status = 'published');
create policy "artists: members read own"
  on public.artists for select to authenticated
  using ((select public.is_artist_member(id)));
create policy "artists: staff read all"
  on public.artists for select to authenticated
  using ((select public.is_staff()));
create policy "artists: staff insert"
  on public.artists for insert to authenticated
  with check ((select public.is_staff()));
create policy "artists: staff update"
  on public.artists for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "artists: admin delete"
  on public.artists for delete to authenticated
  using ((select public.has_role('admin')));

-- artist_members
create policy "artist_members: read own"
  on public.artist_members for select to authenticated
  using (user_id = (select auth.uid()));
create policy "artist_members: staff all"
  on public.artist_members for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- artist_private
create policy "artist_private: members read"
  on public.artist_private for select to authenticated
  using ((select public.is_artist_member(artist_id)));
create policy "artist_private: staff all"
  on public.artist_private for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- artist_links
create policy "artist_links: public read"
  on public.artist_links for select to anon, authenticated
  using ((select public.is_published_artist(artist_id)));
create policy "artist_links: staff all"
  on public.artist_links for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- media_assets
create policy "media_assets: public read"
  on public.media_assets for select to anon, authenticated
  using ((select public.is_published_artist(artist_id)));
create policy "media_assets: staff all"
  on public.media_assets for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- Grants: anon reads public tables only; private tables are invisible.
revoke all on public.artists, public.artist_links, public.media_assets from anon;
grant select on public.artists, public.artist_links, public.media_assets to anon;
revoke all on public.artist_members, public.artist_private from anon;
grant select, insert, update, delete on
  public.artists, public.artist_members, public.artist_private,
  public.artist_links, public.media_assets
  to authenticated;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

-- Public images (no SVG: it can carry scripts). 8 MB cap.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public-media', 'public-media', true, 8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
);

-- Private documents (riders, contracts): signed URLs only. 20 MB cap.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('private-docs', 'private-docs', false, 20971520, array['application/pdf']);

create policy "public-media: staff read"
  on storage.objects for select to authenticated
  using (bucket_id = 'public-media' and (select public.is_staff()));
create policy "public-media: staff upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'public-media' and (select public.is_staff()));
create policy "public-media: staff update"
  on storage.objects for update to authenticated
  using (bucket_id = 'public-media' and (select public.is_staff()));
create policy "public-media: staff delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'public-media' and (select public.is_staff()));

create policy "private-docs: staff all"
  on storage.objects for all to authenticated
  using (bucket_id = 'private-docs' and (select public.is_staff()))
  with check (bucket_id = 'private-docs' and (select public.is_staff()));
