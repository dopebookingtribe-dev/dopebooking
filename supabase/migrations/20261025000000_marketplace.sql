-- Phase 07: marketplace catalog (no payments yet): seller applications,
-- storefronts, products, variants and product images.
-- Money is stored in minor units (cents). See docs/PROJECT_ARCHITECTURE.md §5.5.

create type public.seller_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type public.product_type as enum ('physical', 'digital');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.sellers (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references public.profiles (id) on delete cascade,
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  display_name text not null check (char_length(display_name) between 1 and 120),
  bio text check (char_length(bio) <= 2000),
  country text check (country ~ '^[A-Z]{2}$'),
  website text check (website ~ '^https://' and char_length(website) <= 500),
  logo_asset_id uuid,
  status public.seller_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Private: application text, commission and review trail.
create table public.seller_private (
  seller_id uuid primary key references public.sellers (id) on delete cascade,
  application_note text check (char_length(application_note) <= 4000),
  commission_rate_bps integer check (commission_rate_bps between 0 and 5000),
  review_note text check (char_length(review_note) <= 2000),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 90),
  title text not null check (char_length(title) between 1 and 160),
  description text check (char_length(description) <= 8000),
  product_type public.product_type not null default 'physical',
  status public.content_status not null default 'draft',
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  cover_asset_id uuid,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_seller_idx on public.products (seller_id, updated_at desc);
create index products_public_idx on public.products (status, published_at desc);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  sku text unique check (char_length(sku) <= 64),
  price_amount integer not null check (price_amount between 50 and 10000000),
  stock integer check (stock >= 0),      -- null = unlimited (e.g. digital)
  active boolean not null default true,
  sort_order integer not null default 0
);

create index product_variants_product_idx on public.product_variants (product_id, sort_order);

-- Images can belong to products and seller logos too.
alter table public.media_assets
  add column product_id uuid references public.products (id) on delete cascade,
  add column seller_id uuid references public.sellers (id) on delete cascade;
alter table public.media_assets drop constraint media_assets_one_owner;
alter table public.media_assets add constraint media_assets_one_owner
  check (num_nonnulls(artist_id, event_id, gallery_id, video_id, product_id, seller_id) = 1);
create index media_assets_product_idx on public.media_assets (product_id, sort_order);
create index media_assets_seller_idx on public.media_assets (seller_id);

alter table public.products add constraint products_cover_fk
  foreign key (cover_asset_id) references public.media_assets (id) on delete set null;
alter table public.sellers add constraint sellers_logo_fk
  foreign key (logo_asset_id) references public.media_assets (id) on delete set null;

create trigger sellers_set_updated_at before update on public.sellers
for each row execute function public.set_updated_at();
create trigger seller_private_set_updated_at before update on public.seller_private
for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();
create trigger products_set_published_at
before insert or update of status on public.products
for each row execute function public.set_published_at();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function public.owns_seller(target uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.sellers where id = target and owner_user_id = (select auth.uid())
  );
$$;

create function public.owns_approved_seller(target uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.sellers
    where id = target and owner_user_id = (select auth.uid()) and status = 'approved'
  );
$$;

create function public.is_approved_seller(target uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.sellers where id = target and status = 'approved');
$$;

create function public.owns_product(target uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.products p join public.sellers s on s.id = p.seller_id
    where p.id = target and s.owner_user_id = (select auth.uid())
  );
$$;

/** Published product of an approved seller: what the public may see. */
create function public.is_public_product(target uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.products p join public.sellers s on s.id = p.seller_id
    where p.id = target and p.status = 'published' and s.status = 'approved'
  );
$$;

/** Storage paths are "<folder>/<uuid>/<file>"; safe for any text input. */
create function public.storage_owner_id(object_name text)
returns uuid language plpgsql immutable set search_path = ''
as $$
declare
  v_part text := split_part(object_name, '/', 2);
begin
  if v_part ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return v_part::uuid;
  end if;
  return null;
end;
$$;

revoke execute on function
  public.owns_seller(uuid), public.owns_approved_seller(uuid), public.owns_product(uuid)
  from public, anon;
grant execute on function
  public.owns_seller(uuid), public.owns_approved_seller(uuid), public.owns_product(uuid)
  to authenticated;
revoke execute on function public.is_approved_seller(uuid), public.is_public_product(uuid) from public;
grant execute on function public.is_approved_seller(uuid), public.is_public_product(uuid)
  to anon, authenticated;

-- Sellers can't change their own status or ownership; only staff can.
create function public.guard_seller_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() and (
    new.status is distinct from old.status
    or new.owner_user_id is distinct from old.owner_user_id
    or new.slug is distinct from old.slug
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger sellers_guard_update before update on public.sellers
for each row execute function public.guard_seller_update();

-- Products can't move between sellers.
create function public.guard_product_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.seller_id is distinct from old.seller_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger products_guard_update before update on public.products
for each row execute function public.guard_product_update();

-- New application: notify staff; one application per user (unique owner).
create function public.on_seller_applied()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff uuid;
begin
  for v_staff in
    select distinct user_id from public.user_roles where role in ('staff', 'admin')
  loop
    perform public.queue_notification(
      v_staff, 'seller_applied',
      'New seller application: ' || new.display_name,
      'Review it in the admin.',
      '/admin/sellers/' || new.id,
      'seller_applied_staff', jsonb_build_object('seller', new.display_name)
    );
  end loop;
  return new;
end;
$$;

create trigger sellers_applied after insert on public.sellers
for each row execute function public.on_seller_applied();

/** Staff decision on a seller; grants or removes the seller role. */
create function public.review_seller(
  p_seller uuid,
  p_status public.seller_status,
  p_note text default null
)
returns public.seller_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.sellers;
begin
  if not public.is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into s from public.sellers where id = p_seller for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if char_length(p_note) > 2000 then
    raise exception 'note_too_long' using errcode = '22001';
  end if;

  update public.sellers set status = p_status where id = p_seller;
  insert into public.seller_private (seller_id, review_note, reviewed_by, reviewed_at)
  values (p_seller, nullif(trim(p_note), ''), auth.uid(), now())
  on conflict (seller_id) do update
    set review_note = excluded.review_note,
        reviewed_by = excluded.reviewed_by,
        reviewed_at = excluded.reviewed_at;

  if p_status = 'approved' then
    insert into public.user_roles (user_id, role, granted_by)
    values (s.owner_user_id, 'seller', auth.uid())
    on conflict do nothing;
  else
    delete from public.user_roles where user_id = s.owner_user_id and role = 'seller';
  end if;

  perform public.queue_notification(
    s.owner_user_id, 'seller_review',
    case p_status
      when 'approved' then 'Your shop is approved'
      when 'rejected' then 'Your seller application was not approved'
      when 'suspended' then 'Your shop has been paused'
      else 'Your seller application is pending'
    end,
    nullif(trim(p_note), ''),
    '/dashboard/seller',
    'seller_review', jsonb_build_object('seller', s.display_name, 'status', p_status, 'note', nullif(trim(p_note), ''))
  );
  return p_status;
end;
$$;

revoke execute on function public.review_seller(uuid, public.seller_status, text) from public, anon;
grant execute on function public.review_seller(uuid, public.seller_status, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.sellers enable row level security;
alter table public.seller_private enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;

-- sellers
create policy "sellers: public read approved" on public.sellers
  for select to anon, authenticated using (status = 'approved');
create policy "sellers: owner read" on public.sellers
  for select to authenticated using (owner_user_id = (select auth.uid()));
create policy "sellers: staff read" on public.sellers
  for select to authenticated using ((select public.is_staff()));
create policy "sellers: apply" on public.sellers
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()) and status = 'pending');
create policy "sellers: owner update" on public.sellers
  for update to authenticated
  using (owner_user_id = (select auth.uid())) with check (owner_user_id = (select auth.uid()));
create policy "sellers: staff update" on public.sellers
  for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- seller_private (owner writes the application note once, on apply)
create policy "seller_private: owner read" on public.seller_private
  for select to authenticated using ((select public.owns_seller(seller_id)));
create policy "seller_private: owner create" on public.seller_private
  for insert to authenticated
  with check (
    (select public.owns_seller(seller_id))
    and review_note is null and reviewed_by is null and commission_rate_bps is null
  );
create policy "seller_private: staff all" on public.seller_private
  for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- products
create policy "products: public read" on public.products
  for select to anon, authenticated
  using (status = 'published' and (select public.is_approved_seller(seller_id)));
create policy "products: owner read" on public.products
  for select to authenticated using ((select public.owns_seller(seller_id)));
create policy "products: staff read" on public.products
  for select to authenticated using ((select public.is_staff()));
create policy "products: owner create" on public.products
  for insert to authenticated with check ((select public.owns_approved_seller(seller_id)));
create policy "products: owner update" on public.products
  for update to authenticated
  using ((select public.owns_approved_seller(seller_id)))
  with check ((select public.owns_approved_seller(seller_id)));
create policy "products: owner delete drafts" on public.products
  for delete to authenticated
  using ((select public.owns_seller(seller_id)) and status = 'draft');
create policy "products: staff moderate" on public.products
  for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- product_variants
create policy "variants: public read" on public.product_variants
  for select to anon, authenticated
  using (active and (select public.is_public_product(product_id)));
create policy "variants: owner all" on public.product_variants
  for all to authenticated
  using ((select public.owns_product(product_id)))
  with check ((select public.owns_product(product_id)));
create policy "variants: staff read" on public.product_variants
  for select to authenticated using ((select public.is_staff()));

-- media_assets: public read and seller-owned writes for products and logos.
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
  );
create policy "media_assets: sellers manage own" on public.media_assets
  for all to authenticated
  using (
    (product_id is not null and (select public.owns_product(product_id)))
    or (seller_id is not null and (select public.owns_seller(seller_id)))
  )
  with check (
    (product_id is not null and (select public.owns_product(product_id)))
    or (seller_id is not null and (select public.owns_seller(seller_id)))
  );

-- Storage: sellers upload into products/<their product id>/ and
-- sellers/<their seller id>/ only.
create policy "public-media: sellers read own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'public-media' and (
      ((storage.foldername(name))[1] = 'products' and public.owns_product(public.storage_owner_id(name)))
      or ((storage.foldername(name))[1] = 'sellers' and public.owns_seller(public.storage_owner_id(name)))
    )
  );
create policy "public-media: sellers upload own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'public-media' and (
      ((storage.foldername(name))[1] = 'products' and public.owns_product(public.storage_owner_id(name)))
      or ((storage.foldername(name))[1] = 'sellers' and public.owns_seller(public.storage_owner_id(name)))
    )
  );
create policy "public-media: sellers delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'public-media' and (
      ((storage.foldername(name))[1] = 'products' and public.owns_product(public.storage_owner_id(name)))
      or ((storage.foldername(name))[1] = 'sellers' and public.owns_seller(public.storage_owner_id(name)))
    )
  );

-- Grants
revoke all on public.sellers, public.seller_private, public.products, public.product_variants
  from anon, authenticated;
grant select on public.sellers, public.products, public.product_variants to anon;
grant select, insert, update on public.sellers to authenticated;
grant select, insert, update on public.seller_private to authenticated;
grant select, insert, update, delete on public.products, public.product_variants to authenticated;
