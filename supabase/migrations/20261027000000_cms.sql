-- Phase 10: content management. Editable pages and site settings with
-- draft/publish, a site media library, permissions per role, an audit log,
-- product categories, SEO fields and demo-content flags.
-- See docs/PROJECT_ARCHITECTURE.md §10.

-- ---------------------------------------------------------------------------
-- Permissions: roles map to permissions in a table, so restricted roles
-- (sellers, artists, providers…) can be widened later without code changes.
-- ---------------------------------------------------------------------------

create type public.app_permission as enum (
  'content.manage',   -- artists, events, galleries, videos, catalog curation
  'pages.edit',       -- edit page and settings drafts, media library
  'pages.publish',    -- make drafts public
  'settings.manage',  -- navigation, footer, contact, SEO defaults
  'demo.manage',      -- remove demo content
  'users.manage',     -- grant and revoke roles
  'audit.view'        -- read the audit log
);

create table public.role_permissions (
  role public.app_role not null,
  permission public.app_permission not null,
  primary key (role, permission)
);

insert into public.role_permissions (role, permission)
select 'admin', p from unnest(enum_range(null::public.app_permission)) as p;
insert into public.role_permissions (role, permission) values
  ('staff', 'content.manage'),
  ('staff', 'pages.edit');

create function public.has_permission(required public.app_permission)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role = ur.role
    where ur.user_id = (select auth.uid()) and rp.permission = required
  );
$$;

revoke execute on function public.has_permission(public.app_permission) from public, anon;
grant execute on function public.has_permission(public.app_permission) to authenticated;

alter table public.role_permissions enable row level security;
create policy "role_permissions: signed-in read"
  on public.role_permissions for select to authenticated using (true);
create policy "role_permissions: admins manage"
  on public.role_permissions for all to authenticated
  using ((select public.has_permission('users.manage')))
  with check ((select public.has_permission('users.manage')));
revoke all on public.role_permissions from anon;
grant select, insert, update, delete on public.role_permissions to authenticated;

-- ---------------------------------------------------------------------------
-- Audit log: written by triggers only; readable with audit.view.
-- Records who changed what and which columns, never the values themselves.
-- ---------------------------------------------------------------------------

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  table_name text not null,
  record_id text,
  changed text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_record_idx on public.audit_log (table_name, record_id);

create function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  v_old jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_changed text[] := '{}';
begin
  if tg_op = 'UPDATE' then
    select coalesce(array_agg(key order by key), '{}') into v_changed
    from jsonb_each(v_new) as n(key, value)
    where key not in ('updated_at', 'draft_updated_at')
      and n.value is distinct from v_old -> key;
    if cardinality(v_changed) = 0 then
      return null;
    end if;
  end if;

  insert into public.audit_log (actor_id, action, table_name, record_id, changed)
  values (
    (select auth.uid()),
    tg_op,
    tg_table_name,
    coalesce(v_row ->> 'id', v_row ->> 'key', v_row ->> 'artist_id', v_row ->> 'user_id', v_row ->> 'role'),
    v_changed
  );
  return null;
end;
$$;

alter table public.audit_log enable row level security;
create policy "audit_log: read with permission"
  on public.audit_log for select to authenticated
  using ((select public.has_permission('audit.view')));
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

-- ---------------------------------------------------------------------------
-- Demo flags, SEO fields and richer artist/product presentation
-- ---------------------------------------------------------------------------

alter table public.artists
  add column is_demo boolean not null default false,
  add column booking_info text check (char_length(booking_info) <= 1000),
  add column cover_asset_id uuid references public.media_assets (id) on delete set null,
  add column seo_title text check (char_length(seo_title) <= 70),
  add column seo_description text check (char_length(seo_description) <= 200);

alter table public.events
  add column is_demo boolean not null default false,
  add column seo_title text check (char_length(seo_title) <= 70),
  add column seo_description text check (char_length(seo_description) <= 200);

alter table public.galleries
  add column is_demo boolean not null default false,
  add column seo_title text check (char_length(seo_title) <= 70),
  add column seo_description text check (char_length(seo_description) <= 200);

alter table public.videos
  add column is_demo boolean not null default false;

alter table public.sellers
  add column is_demo boolean not null default false;

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  name text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 300),
  sort_order integer not null default 0,
  visible boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger product_categories_set_updated_at
before update on public.product_categories
for each row execute function public.set_updated_at();

alter table public.products
  add column is_demo boolean not null default false,
  add column category_id uuid references public.product_categories (id) on delete set null,
  add column featured boolean not null default false,
  add column sort_order integer not null default 0,
  add column seo_title text check (char_length(seo_title) <= 70),
  add column seo_description text check (char_length(seo_description) <= 200);

create index products_category_idx on public.products (category_id);

alter table public.product_categories enable row level security;
create policy "product_categories: public read visible"
  on public.product_categories for select to anon, authenticated
  using (visible);
create policy "product_categories: staff all"
  on public.product_categories for all to authenticated
  using ((select public.has_permission('content.manage')))
  with check ((select public.has_permission('content.manage')));
revoke all on public.product_categories from anon;
grant select on public.product_categories to anon;
grant select, insert, update, delete on public.product_categories to authenticated;

-- Sellers may pick a category for their own products, but featuring and
-- ordering on the storefront stay with staff.
create function public.guard_product_curation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- auth.uid() is null for service-role scripts (demo seeding).
  if (select auth.uid()) is null or public.has_permission('content.manage') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.featured := false;
    new.sort_order := 0;
    new.is_demo := false;
  elsif new.featured is distinct from old.featured
     or new.sort_order is distinct from old.sort_order
     or new.is_demo is distinct from old.is_demo then
    raise exception 'Only staff can feature or order products' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger products_guard_curation
before insert or update on public.products
for each row execute function public.guard_product_curation();

-- ---------------------------------------------------------------------------
-- Site media library: images not tied to one artist/event/product.
-- library = 'site' marks them; focal point steers cropping (object-position).
-- ---------------------------------------------------------------------------

alter table public.media_assets
  add column library text check (library = 'site'),
  add column is_demo boolean not null default false,
  add column focal_x smallint not null default 50 check (focal_x between 0 and 100),
  add column focal_y smallint not null default 50 check (focal_y between 0 and 100);

alter table public.media_assets drop constraint media_assets_one_owner;
alter table public.media_assets add constraint media_assets_one_owner
  check (num_nonnulls(artist_id, event_id, gallery_id, video_id, product_id, seller_id, library) = 1);

create index media_assets_library_idx on public.media_assets (library, created_at desc)
  where library is not null;

create policy "media_assets: public read library"
  on public.media_assets for select to anon, authenticated
  using (library is not null);

-- ---------------------------------------------------------------------------
-- Pages and settings: one row each, with a draft and a published version.
-- The JSON shape is validated in the app (src/modules/cms/sections.ts);
-- the database guards size and publication rights.
-- ---------------------------------------------------------------------------

create table public.site_pages (
  key text primary key
    check (key ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(key) <= 60),
  title text not null check (char_length(title) between 1 and 120),
  draft jsonb not null,
  published jsonb,
  draft_updated_at timestamptz not null default now(),
  published_at timestamptz,
  updated_by uuid references public.profiles (id) on delete set null,
  published_by uuid references public.profiles (id) on delete set null,
  check (pg_column_size(draft) < 500000),
  check (published is null or pg_column_size(published) < 500000)
);

create table public.site_settings (
  id smallint primary key default 1 check (id = 1),
  draft jsonb not null,
  published jsonb,
  draft_updated_at timestamptz not null default now(),
  published_at timestamptz,
  updated_by uuid references public.profiles (id) on delete set null,
  published_by uuid references public.profiles (id) on delete set null,
  check (pg_column_size(draft) < 200000),
  check (published is null or pg_column_size(published) < 200000)
);

-- Drafts move to published only through publish_*(), which checks rights.
create function public.guard_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.published is distinct from old.published
     and coalesce(current_setting('dopebooking.publishing', true), '') <> 'on'
     and (select auth.uid()) is not null then
    raise exception 'Use publish to change the live version' using errcode = '42501';
  end if;
  if new.draft is distinct from old.draft then
    new.draft_updated_at = now();
    new.updated_by = coalesce((select auth.uid()), new.updated_by);
  end if;
  return new;
end;
$$;

create trigger site_pages_guard before update on public.site_pages
for each row execute function public.guard_publication();
create trigger site_settings_guard before update on public.site_settings
for each row execute function public.guard_publication();

alter table public.site_pages enable row level security;
alter table public.site_settings enable row level security;

create policy "site_pages: editors read"
  on public.site_pages for select to authenticated
  using ((select public.has_permission('pages.edit')));
create policy "site_pages: editors insert drafts"
  on public.site_pages for insert to authenticated
  with check ((select public.has_permission('pages.edit')) and published is null);
create policy "site_pages: editors update drafts"
  on public.site_pages for update to authenticated
  using ((select public.has_permission('pages.edit')))
  with check ((select public.has_permission('pages.edit')));
create policy "site_pages: admins delete"
  on public.site_pages for delete to authenticated
  using ((select public.has_permission('pages.publish')));

create policy "site_settings: editors read"
  on public.site_settings for select to authenticated
  using ((select public.has_permission('settings.manage')));
create policy "site_settings: editors insert drafts"
  on public.site_settings for insert to authenticated
  with check ((select public.has_permission('settings.manage')) and published is null);
create policy "site_settings: editors update drafts"
  on public.site_settings for update to authenticated
  using ((select public.has_permission('settings.manage')))
  with check ((select public.has_permission('settings.manage')));

revoke all on public.site_pages, public.site_settings from anon;
grant select, insert, update, delete on public.site_pages to authenticated;
grant select, insert, update on public.site_settings to authenticated;

-- Public reads: only the published JSON, never drafts.
create function public.get_published_page(p_key text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select published from public.site_pages where key = p_key;
$$;

create function public.get_published_settings()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select published from public.site_settings where id = 1;
$$;

revoke execute on function public.get_published_page(text), public.get_published_settings() from public;
grant execute on function public.get_published_page(text), public.get_published_settings() to anon, authenticated;

create function public.publish_site_page(p_key text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_at timestamptz := now();
begin
  if not public.has_permission('pages.publish') then
    raise exception 'Not allowed to publish' using errcode = '42501';
  end if;
  perform set_config('dopebooking.publishing', 'on', true);
  update public.site_pages
     set published = draft, published_at = v_at, published_by = (select auth.uid())
   where key = p_key;
  if not found then
    raise exception 'Page not found' using errcode = 'P0002';
  end if;
  perform set_config('dopebooking.publishing', 'off', true);
  return v_at;
end;
$$;

create function public.publish_site_settings()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_at timestamptz := now();
begin
  if not (public.has_permission('pages.publish') and public.has_permission('settings.manage')) then
    raise exception 'Not allowed to publish' using errcode = '42501';
  end if;
  perform set_config('dopebooking.publishing', 'on', true);
  update public.site_settings
     set published = draft, published_at = v_at, published_by = (select auth.uid())
   where id = 1;
  if not found then
    raise exception 'Settings not found' using errcode = 'P0002';
  end if;
  perform set_config('dopebooking.publishing', 'off', true);
  return v_at;
end;
$$;

revoke execute on function public.publish_site_page(text), public.publish_site_settings() from public, anon;
grant execute on function public.publish_site_page(text), public.publish_site_settings() to authenticated;

-- ---------------------------------------------------------------------------
-- Demo content removal: deletes every row flagged is_demo and returns the
-- storage paths so the app can remove the files too.
-- ---------------------------------------------------------------------------

create function public.delete_demo_content()
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
     or m.seller_id in (select id from public.sellers where is_demo);

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
-- Storage: the library folder is managed by page editors.
-- ---------------------------------------------------------------------------

create policy "public-media: editors manage library"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'public-media' and (storage.foldername(name))[1] = 'library'
    and (select public.has_permission('pages.edit'))
  )
  with check (
    bucket_id = 'public-media' and (storage.foldername(name))[1] = 'library'
    and (select public.has_permission('pages.edit'))
  );

-- ---------------------------------------------------------------------------
-- Audit triggers on content, settings and access tables
-- ---------------------------------------------------------------------------

create trigger audit_artists after insert or update or delete on public.artists
for each row execute function public.audit_row();
create trigger audit_artist_private after insert or update or delete on public.artist_private
for each row execute function public.audit_row();
create trigger audit_events after insert or update or delete on public.events
for each row execute function public.audit_row();
create trigger audit_galleries after insert or update or delete on public.galleries
for each row execute function public.audit_row();
create trigger audit_videos after insert or update or delete on public.videos
for each row execute function public.audit_row();
create trigger audit_products after insert or update or delete on public.products
for each row execute function public.audit_row();
create trigger audit_product_categories after insert or update or delete on public.product_categories
for each row execute function public.audit_row();
create trigger audit_sellers after insert or update or delete on public.sellers
for each row execute function public.audit_row();
create trigger audit_media_assets after insert or update or delete on public.media_assets
for each row execute function public.audit_row();
create trigger audit_site_pages after insert or update or delete on public.site_pages
for each row execute function public.audit_row();
create trigger audit_site_settings after insert or update or delete on public.site_settings
for each row execute function public.audit_row();
create trigger audit_user_roles after insert or update or delete on public.user_roles
for each row execute function public.audit_row();
create trigger audit_role_permissions after insert or update or delete on public.role_permissions
for each row execute function public.audit_row();
