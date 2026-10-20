-- Phase 08: orders, payments (Stripe, separate charges and transfers),
-- seller payout accounts, fulfilment and digital files.
-- Orders are written only by the server with the service role (checkout and
-- the Stripe webhook); clients read their own rows through RLS.

create type public.order_status as enum (
  'pending_payment', 'paid', 'fulfilled', 'cancelled', 'refunded', 'partially_refunded'
);
create type public.seller_order_status as enum (
  'pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'
);
create type public.transfer_status as enum ('pending', 'transferred', 'failed', 'reversed');

-- ---------------------------------------------------------------------------
-- Seller payouts and shipping
-- ---------------------------------------------------------------------------

alter table public.sellers
  add column shipping_flat_amount integer not null default 0
    check (shipping_flat_amount between 0 and 100000);
grant update (shipping_flat_amount) on public.sellers to authenticated;

create table public.seller_stripe (
  seller_id uuid primary key references public.sellers (id) on delete cascade,
  stripe_account_id text not null unique,
  transfers_status text not null default 'pending',
  payouts_status text,
  requirements_due integer not null default 0,
  updated_at timestamptz not null default now()
);

create trigger seller_stripe_set_updated_at before update on public.seller_stripe
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique
    default ('OR-' || upper(substr(md5(gen_random_uuid()::text), 1, 8))),
  buyer_id uuid references public.profiles (id) on delete set null,
  buyer_email text,
  status public.order_status not null default 'pending_payment',
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  items_total integer not null check (items_total >= 0),
  shipping_total integer not null default 0 check (shipping_total >= 0),
  total integer not null check (total >= 0),
  refunded_amount integer not null default 0 check (refunded_amount >= 0),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  stripe_charge_id text,
  shipping_name text,
  shipping_address jsonb,
  -- sha256 of the secret in a guest's private order link
  access_token_hash text not null,
  needs_attention text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total = items_total + shipping_total)
);

create index orders_buyer_idx on public.orders (buyer_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);

create table public.seller_orders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  seller_id uuid not null references public.sellers (id) on delete restrict,
  status public.seller_order_status not null default 'pending',
  items_total integer not null check (items_total >= 0),
  shipping_amount integer not null default 0 check (shipping_amount >= 0),
  commission_rate_bps integer not null check (commission_rate_bps between 0 and 5000),
  commission_amount integer not null check (commission_amount >= 0),
  seller_amount integer not null check (seller_amount >= 0),
  stripe_account_id text not null,
  stripe_transfer_id text unique,
  transfer_status public.transfer_status not null default 'pending',
  transfer_error text,
  carrier text check (char_length(carrier) <= 60),
  tracking_number text check (char_length(tracking_number) <= 100),
  shipped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, seller_id),
  check (seller_amount = items_total - commission_amount + shipping_amount)
);

create index seller_orders_seller_idx on public.seller_orders (seller_id, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  seller_order_id uuid not null references public.seller_orders (id) on delete cascade,
  -- Products with sales can't be deleted (archive instead).
  product_id uuid references public.products (id) on delete restrict,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_title text not null,
  variant_name text not null,
  product_type public.product_type not null,
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 20),
  line_total integer not null,
  check (line_total = unit_price * quantity)
);

create index order_items_order_idx on public.order_items (order_id);
create index order_items_seller_order_idx on public.order_items (seller_order_id);

-- Webhook idempotency: each Stripe event is processed once.
create table public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text
);

-- Downloadable files for digital products (private bucket).
create table public.product_files (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null check (char_length(file_name) between 1 and 200),
  size_bytes bigint not null check (size_bytes > 0),
  created_at timestamptz not null default now()
);

create index product_files_product_idx on public.product_files (product_id);

create trigger orders_set_updated_at before update on public.orders
for each row execute function public.set_updated_at();
create trigger seller_orders_set_updated_at before update on public.seller_orders
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

/** Lowers stock after payment; returns true if anything was oversold. */
create function public.apply_order_stock(p_order uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_oversold boolean := false;
  v_stock integer;
  item record;
begin
  for item in
    select variant_id, sum(quantity)::integer as quantity
    from public.order_items where order_id = p_order and variant_id is not null
    group by variant_id
  loop
    select stock into v_stock from public.product_variants
    where id = item.variant_id for update;
    if v_stock is not null then
      if v_stock < item.quantity then
        v_oversold := true;
      end if;
      update public.product_variants
      set stock = greatest(v_stock - item.quantity, 0)
      where id = item.variant_id;
    end if;
  end loop;
  return v_oversold;
end;
$$;

revoke execute on function public.apply_order_stock(uuid) from public, anon, authenticated;
grant execute on function public.apply_order_stock(uuid) to service_role;

/** Seller marks their part of an order as shipped (or delivered). */
create function public.mark_seller_order_shipped(
  p_seller_order uuid,
  p_carrier text default null,
  p_tracking text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  so public.seller_orders;
  o public.orders;
begin
  select * into so from public.seller_orders where id = p_seller_order for update;
  if not found or not public.owns_seller(so.seller_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if so.status <> 'paid' then
    raise exception 'invalid_transition' using errcode = '22023';
  end if;

  update public.seller_orders
  set status = 'shipped', shipped_at = now(),
      carrier = nullif(left(trim(p_carrier), 60), ''),
      tracking_number = nullif(left(trim(p_tracking), 100), '')
  where id = p_seller_order;

  select * into o from public.orders where id = so.order_id;
  -- All parts shipped: the order is fulfilled.
  if not exists (
    select 1 from public.seller_orders
    where order_id = so.order_id and status = 'paid'
  ) then
    update public.orders set status = 'fulfilled' where id = so.order_id and status = 'paid';
  end if;

  if o.buyer_id is not null then
    perform public.queue_notification(
      o.buyer_id, 'order_shipped',
      'Order ' || o.reference || ' is on its way',
      coalesce(nullif(trim(p_carrier), '') || ' ' || nullif(trim(p_tracking), ''), 'Shipped'),
      '/dashboard/orders/' || o.id,
      'order_shipped', jsonb_build_object(
        'reference', o.reference, 'carrier', nullif(trim(p_carrier), ''),
        'tracking', nullif(trim(p_tracking), '')
      )
    );
  elsif o.buyer_email is not null then
    insert into public.email_outbox (to_email, template, payload)
    values (o.buyer_email, 'order_shipped', jsonb_build_object(
      'reference', o.reference, 'carrier', nullif(trim(p_carrier), ''),
      'tracking', nullif(trim(p_tracking), ''), 'link', '/dashboard'
    ));
  end if;
end;
$$;

revoke execute on function public.mark_seller_order_shipped(uuid, text, text) from public, anon;
grant execute on function public.mark_seller_order_shipped(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.seller_stripe enable row level security;
alter table public.orders enable row level security;
alter table public.seller_orders enable row level security;
alter table public.order_items enable row level security;
alter table public.stripe_events enable row level security;
alter table public.product_files enable row level security;

create policy "seller_stripe: owner read" on public.seller_stripe
  for select to authenticated using ((select public.owns_seller(seller_id)));
create policy "seller_stripe: staff read" on public.seller_stripe
  for select to authenticated using ((select public.is_staff()));

create policy "orders: buyer read own" on public.orders
  for select to authenticated using (buyer_id = (select auth.uid()));
create policy "orders: staff read" on public.orders
  for select to authenticated using ((select public.is_staff()));

create policy "seller_orders: seller read own" on public.seller_orders
  for select to authenticated using ((select public.owns_seller(seller_id)));
create policy "seller_orders: buyer read" on public.seller_orders
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = (select auth.uid())));
create policy "seller_orders: staff read" on public.seller_orders
  for select to authenticated using ((select public.is_staff()));

create policy "order_items: buyer read" on public.order_items
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = (select auth.uid())));
create policy "order_items: seller read own" on public.order_items
  for select to authenticated
  using (exists (
    select 1 from public.seller_orders so
    where so.id = seller_order_id and (select public.owns_seller(so.seller_id))
  ));
create policy "order_items: staff read" on public.order_items
  for select to authenticated using ((select public.is_staff()));

create policy "product_files: owner all" on public.product_files
  for all to authenticated
  using ((select public.owns_product(product_id)))
  with check ((select public.owns_product(product_id)));
create policy "product_files: staff read" on public.product_files
  for select to authenticated using ((select public.is_staff()));

-- No policies on stripe_events: service role only.

revoke all on public.seller_stripe, public.orders, public.seller_orders,
  public.order_items, public.stripe_events, public.product_files
  from anon, authenticated;
grant select on public.seller_stripe, public.orders, public.seller_orders,
  public.order_items to authenticated;
grant select, insert, delete on public.product_files to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private bucket for digital goods (sellers write their own folder;
-- buyers only ever get short-lived signed URLs from the server).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'digital-goods', 'digital-goods', false, 52428800,
  array[
    'application/zip', 'application/x-zip-compressed', 'application/pdf',
    'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/aiff', 'audio/x-aiff',
    'image/jpeg', 'image/png'
  ]
);

create policy "digital-goods: sellers manage own" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'digital-goods'
    and (storage.foldername(name))[1] = 'products'
    and public.owns_product(public.storage_owner_id(name))
  )
  with check (
    bucket_id = 'digital-goods'
    and (storage.foldername(name))[1] = 'products'
    and public.owns_product(public.storage_owner_id(name))
  );
