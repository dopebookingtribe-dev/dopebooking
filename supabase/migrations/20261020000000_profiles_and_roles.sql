-- Phase 02: profiles, roles and role helpers.
-- See docs/PROJECT_ARCHITECTURE.md §5.1 and §5.9.

create type public.app_role as enum (
  'customer', 'promoter', 'artist', 'seller', 'provider', 'staff', 'admin'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 80),
  avatar_path text,
  country text check (country ~ '^[A-Z]{2}$'),          -- ISO 3166-1 alpha-2
  phone text check (char_length(phone) <= 32),          -- private
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create index user_roles_role_idx on public.user_roles (role);

-- ---------------------------------------------------------------------------
-- Helpers (security definer so policies can call them without recursion)
-- ---------------------------------------------------------------------------

create function public.has_role(required public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = required
  );
$$;

create function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role in ('staff', 'admin')
  );
$$;

revoke execute on function public.has_role(public.app_role) from public, anon;
revoke execute on function public.is_staff() from public, anon;
grant execute on function public.has_role(public.app_role) to authenticated;
grant execute on function public.is_staff() to authenticated;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- New auth user -> profile + default 'customer' role.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(left(trim(new.raw_user_meta_data ->> 'display_name'), 80), '')
  );
  insert into public.user_roles (user_id, role) values (new.id, 'customer');
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

-- profiles: owner and staff can read; owner can edit a fixed set of columns.
create policy "profiles: read own"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: staff read all"
  on public.profiles for select to authenticated
  using ((select public.is_staff()));

create policy "profiles: update own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke all on public.profiles from anon;
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, avatar_path, country, phone, marketing_opt_in)
  on public.profiles to authenticated;

-- user_roles: users see their own roles; only admins grant or revoke.
create policy "user_roles: read own"
  on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()));

create policy "user_roles: staff read all"
  on public.user_roles for select to authenticated
  using ((select public.is_staff()));

create policy "user_roles: admin grant"
  on public.user_roles for insert to authenticated
  with check (
    (select public.has_role('admin'))
    and granted_by = (select auth.uid())
  );

create policy "user_roles: admin revoke"
  on public.user_roles for delete to authenticated
  using ((select public.has_role('admin')) and user_id <> (select auth.uid()));

revoke all on public.user_roles from anon;
revoke update on public.user_roles from authenticated;
grant select, insert, delete on public.user_roles to authenticated;
