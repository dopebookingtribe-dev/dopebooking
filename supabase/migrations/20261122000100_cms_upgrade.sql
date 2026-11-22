-- Admin CMS upgrade, part 2 (2026-11-22). Additive only: no table, column,
-- row or policy that exists today is removed or rewritten.
--
-- 1. Media library: videos, audio and documents (new public bucket
--    `site-files`), file metadata, replace and safe delete.
-- 2. Videos: play an uploaded file; display order.
-- 3. Shop: staff can create, edit and delete listings and their variants
--    and digital files (sellers keep their own access).
-- 4. News: blog posts with draft, scheduled and published states.
-- 5. Artists: availability windows and a press-kit document.
-- 6. Permissions: the admin role can never lose users.manage (no lock-out).
-- See docs/PROJECT_ARCHITECTURE.md, "Phase 13".

-- ---------------------------------------------------------------------------
-- 1. Media library
-- ---------------------------------------------------------------------------

alter table public.media_assets
  add column mime_type text
    check (mime_type ~ '^[a-z]+/[a-z0-9.+-]+$' and char_length(mime_type) <= 100),
  add column size_bytes bigint check (size_bytes >= 0),
  add column original_name text check (char_length(original_name) <= 200),
  add column duration_seconds integer check (duration_seconds >= 0),
  add column updated_at timestamptz not null default now();

-- Videos, audio and documents live in the shared library only; images keep
-- every owner they had.
alter table public.media_assets add constraint media_assets_files_in_library
  check (type = 'image' or library is not null);

create index media_assets_type_idx on public.media_assets (type, created_at desc);

create trigger media_assets_set_updated_at
before update on public.media_assets
for each row execute function public.set_updated_at();

grant select (mime_type, size_bytes, duration_seconds, updated_at)
  on public.media_assets to anon;

-- Public bucket for library videos, audio and PDFs. 50 MB, the same cap as
-- the other large buckets. Images stay in public-media (8 MB, no SVG).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-files', 'site-files', true, 52428800,
  array[
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/aac',
    'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/ogg', 'audio/flac',
    'audio/x-flac',
    'application/pdf'
  ]
)
on conflict (id) do nothing;

create policy "site-files: editors manage library"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'site-files' and (storage.foldername(name))[1] = 'library'
    and ((select public.has_permission('pages.edit'))
      or (select public.has_permission('content.manage')))
  )
  with check (
    bucket_id = 'site-files' and (storage.foldername(name))[1] = 'library'
    and ((select public.has_permission('pages.edit'))
      or (select public.has_permission('content.manage')))
  );

-- Videos and catalogue editors (content.manage) may add library images too,
-- e.g. a news cover, not only page editors.
create policy "public-media: content editors manage library"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'public-media' and (storage.foldername(name))[1] = 'library'
    and (select public.has_permission('content.manage'))
  )
  with check (
    bucket_id = 'public-media' and (storage.foldername(name))[1] = 'library'
    and (select public.has_permission('content.manage'))
  );

-- ---------------------------------------------------------------------------
-- 2. Videos: uploaded files and display order
-- ---------------------------------------------------------------------------

-- The file is a library asset. "restrict": it can't be deleted while a video
-- plays it.
alter table public.videos
  add column file_asset_id uuid references public.media_assets (id) on delete restrict,
  add column sort_order integer not null default 0;

-- Compared as text so this also works in the same run that adds 'file'.
alter table public.videos add constraint videos_file_source check (
  ((provider::text = 'file') = (file_asset_id is not null))
  and (provider::text <> 'file' or provider_ref = file_asset_id::text)
);

create index videos_order_idx on public.videos (featured desc, sort_order, published_at desc);
create index videos_file_idx on public.videos (file_asset_id) where file_asset_id is not null;

grant select (file_asset_id, sort_order) on public.videos to anon;

-- ---------------------------------------------------------------------------
-- 3. Shop: staff manage listings
-- ---------------------------------------------------------------------------

create policy "products: staff create" on public.products
  for insert to authenticated
  with check ((select public.has_permission('content.manage')));
-- Products that were ordered can't be deleted (order_items restrict); the
-- app offers archiving instead.
create policy "products: staff delete" on public.products
  for delete to authenticated
  using ((select public.has_permission('content.manage')));

create policy "variants: staff manage" on public.product_variants
  for all to authenticated
  using ((select public.has_permission('content.manage')))
  with check ((select public.has_permission('content.manage')));

create policy "product_files: staff manage" on public.product_files
  for all to authenticated
  using ((select public.has_permission('content.manage')))
  with check ((select public.has_permission('content.manage')));

create policy "digital-goods: staff manage" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'digital-goods' and (storage.foldername(name))[1] = 'products'
    and (select public.has_permission('content.manage'))
  )
  with check (
    bucket_id = 'digital-goods' and (storage.foldername(name))[1] = 'products'
    and (select public.has_permission('content.manage'))
  );

-- ---------------------------------------------------------------------------
-- 4. News (blog posts)
-- ---------------------------------------------------------------------------

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title text not null check (char_length(title) between 1 and 160),
  excerpt text check (char_length(excerpt) <= 400),
  -- Plain text with light markup (## headings, - lists, > quotes, links and
  -- [[photo:id]] embeds), parsed in the app. No HTML is stored.
  body text not null default '' check (char_length(body) <= 40000),
  category text check (char_length(category) between 1 and 40),
  tags text[] not null default '{}' check (cardinality(tags) <= 10),
  author_name text check (char_length(author_name) <= 80),
  cover_asset_id uuid references public.media_assets (id) on delete set null,
  artist_id uuid references public.artists (id) on delete set null,
  event_id uuid references public.events (id) on delete set null,
  status public.content_status not null default 'draft',
  featured boolean not null default false,
  sort_order integer not null default 0,
  -- A future date schedules the post: visitors see it from then on.
  published_at timestamptz,
  seo_title text check (char_length(seo_title) <= 70),
  seo_description text check (char_length(seo_description) <= 200),
  is_demo boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_public_idx on public.posts (status, published_at desc);
create index posts_artist_idx on public.posts (artist_id) where artist_id is not null;
create index posts_event_idx on public.posts (event_id) where event_id is not null;

create trigger posts_set_updated_at
before update on public.posts
for each row execute function public.set_updated_at();
create trigger posts_set_published_at
before insert or update of status on public.posts
for each row execute function public.set_published_at();
create trigger audit_posts after insert or update or delete on public.posts
for each row execute function public.audit_row();

alter table public.posts enable row level security;
create policy "posts: public read published" on public.posts
  for select to anon, authenticated
  using (status = 'published' and published_at <= now());
create policy "posts: staff all" on public.posts
  for all to authenticated
  using ((select public.has_permission('content.manage')))
  with check ((select public.has_permission('content.manage')));

revoke all on public.posts from anon;
grant select (
  id, slug, title, excerpt, body, category, tags, author_name, cover_asset_id,
  artist_id, event_id, status, featured, sort_order, published_at, seo_title,
  seo_description, is_demo, created_at, updated_at
) on public.posts to anon;
grant select, insert, update, delete on public.posts to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Artists: availability and press kit
-- ---------------------------------------------------------------------------

create table public.artist_availability (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'available'
    check (status in ('available', 'touring', 'booked', 'unavailable')),
  location text check (char_length(location) <= 120),
  note text check (char_length(note) <= 300),
  -- Only public windows show on the artist page.
  is_public boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  check (ends_on - starts_on <= 366)
);

create index artist_availability_artist_idx on public.artist_availability (artist_id, starts_on);

create trigger artist_availability_set_updated_at
before update on public.artist_availability
for each row execute function public.set_updated_at();
create trigger audit_artist_availability after insert or update or delete on public.artist_availability
for each row execute function public.audit_row();

alter table public.artist_availability enable row level security;
create policy "artist_availability: public read" on public.artist_availability
  for select to anon, authenticated
  using (is_public and (select public.is_published_artist(artist_id)));
create policy "artist_availability: members read own" on public.artist_availability
  for select to authenticated
  using ((select public.is_artist_member(artist_id)));
create policy "artist_availability: staff all" on public.artist_availability
  for all to authenticated
  using ((select public.has_permission('content.manage')))
  with check ((select public.has_permission('content.manage')));

revoke all on public.artist_availability from anon;
grant select (id, artist_id, starts_on, ends_on, status, location, note, is_public)
  on public.artist_availability to anon;
grant select, insert, update, delete on public.artist_availability to authenticated;

-- A PDF from the media library. "restrict": it can't be deleted while used.
alter table public.artists
  add column press_kit_asset_id uuid references public.media_assets (id) on delete restrict;
grant select (press_kit_asset_id) on public.artists to anon;

-- ---------------------------------------------------------------------------
-- 6. Permissions: no lock-out
-- ---------------------------------------------------------------------------

create function public.guard_role_permissions()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.role = 'admin' and old.permission = 'users.manage'
     and (tg_op = 'DELETE' or new.role <> 'admin' or new.permission <> 'users.manage') then
    raise exception 'The admin role always keeps users.manage' using errcode = '42501';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger role_permissions_guard
before update or delete on public.role_permissions
for each row execute function public.guard_role_permissions();

revoke execute on function public.guard_role_permissions() from public, anon, authenticated;
