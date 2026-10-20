-- Phase 06: promotion, catering and production (photo/video/aftermovie)
-- requests, plus a directory of service providers.
-- One table serves every service type; type-specific answers live in
-- `details` (validated per type by the app, size-capped here).

create type public.service_type as enum (
  'promotion', 'catering', 'photography', 'videography', 'aftermovie'
);
create type public.service_status as enum (
  'submitted', 'under_review', 'quoted', 'accepted', 'confirmed',
  'completed', 'declined', 'cancelled', 'expired'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.service_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  services public.service_type[] not null default '{}',
  contact_name text check (char_length(contact_name) <= 120),
  email text check (char_length(email) <= 254),
  phone text check (char_length(phone) <= 32),
  regions text check (char_length(regions) <= 300),
  website text check (website ~ '^https://' and char_length(website) <= 500),
  notes text check (char_length(notes) <= 4000),
  active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique
    default ('SR-' || upper(substr(md5(gen_random_uuid()::text), 1, 8))),
  service_type public.service_type not null,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  organisation text check (char_length(organisation) <= 160),
  event_name text not null check (char_length(event_name) between 1 and 160),
  event_start date not null,
  event_end date,
  city text not null check (char_length(city) between 1 and 80),
  country text not null check (country ~ '^[A-Z]{2}$'),
  venue_name text check (char_length(venue_name) <= 160),
  expected_attendance integer check (expected_attendance between 1 and 1000000),
  budget_amount integer check (budget_amount >= 0),
  budget_currency text not null default 'EUR' check (budget_currency ~ '^[A-Z]{3}$'),
  message text check (char_length(message) <= 4000),
  details jsonb not null default '{}'
    check (jsonb_typeof(details) = 'object' and octet_length(details::text) <= 8000),
  contact_phone text check (char_length(contact_phone) <= 32),
  contact_email text,
  status public.service_status not null default 'submitted',
  quote_amount integer check (quote_amount >= 0),
  quote_currency text check (quote_currency ~ '^[A-Z]{3}$'),
  quote_note text check (char_length(quote_note) <= 2000),
  assigned_staff_id uuid references public.profiles (id) on delete set null,
  assigned_provider_id uuid references public.service_providers (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (event_end is null or event_end >= event_start)
);

create index service_requests_requester_idx on public.service_requests (requester_id, created_at desc);
create index service_requests_status_idx on public.service_requests (status, created_at desc);

create table public.service_request_status_history (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.service_requests (id) on delete cascade,
  from_status public.service_status,
  to_status public.service_status not null,
  changed_by uuid references public.profiles (id) on delete set null,
  note text check (char_length(note) <= 2000),
  created_at timestamptz not null default now()
);

create index service_request_history_idx on public.service_request_status_history (request_id, created_at);

create table public.service_request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(body) between 1 and 4000),
  internal boolean not null default false,
  created_at timestamptz not null default now()
);

create index service_request_messages_idx on public.service_request_messages (request_id, created_at);

create trigger service_providers_set_updated_at before update on public.service_providers
for each row execute function public.set_updated_at();
create trigger service_requests_set_updated_at before update on public.service_requests
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helpers and triggers
-- ---------------------------------------------------------------------------

create function public.service_label(t public.service_type)
returns text language sql immutable set search_path = ''
as $$
  select case t
    when 'promotion' then 'Event promotion'
    when 'catering' then 'Festival catering'
    when 'photography' then 'Photography'
    when 'videography' then 'Videography'
    when 'aftermovie' then 'Aftermovie'
  end;
$$;

create function public.notify_service_staff(
  p_request uuid, kind text, title text, body text,
  template text default null, payload jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assigned uuid;
  v_staff uuid;
  v_link text := '/admin/services/' || p_request;
begin
  select assigned_staff_id into v_assigned from public.service_requests where id = p_request;
  if v_assigned is not null then
    perform public.queue_notification(v_assigned, kind, title, body, v_link, template, payload);
  else
    for v_staff in
      select distinct user_id from public.user_roles where role in ('staff', 'admin')
    loop
      perform public.queue_notification(v_staff, kind, title, body, v_link, template, payload);
    end loop;
  end if;
end;
$$;

revoke execute on function
  public.notify_service_staff(uuid, text, text, text, text, jsonb)
  from public, anon, authenticated;

create function public.before_service_request_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from public.service_requests
    where requester_id = new.requester_id and created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  select email into new.contact_email from auth.users where id = new.requester_id;
  return new;
end;
$$;

create trigger service_requests_before_insert
before insert on public.service_requests
for each row execute function public.before_service_request_insert();

create function public.on_service_request_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_label text := public.service_label(new.service_type);
  v_payload jsonb := jsonb_build_object(
    'reference', new.reference, 'service', v_label,
    'event_name', new.event_name, 'event_date', new.event_start, 'city', new.city
  );
begin
  insert into public.service_request_status_history (request_id, from_status, to_status, changed_by)
  values (new.id, null, 'submitted', new.requester_id);

  perform public.queue_notification(
    new.requester_id, 'service_received',
    v_label || ' request ' || new.reference || ' received',
    'We''ll review it and reply with a quote soon.',
    '/dashboard/requests/' || new.id,
    'service_received', v_payload
  );
  perform public.notify_service_staff(
    new.id, 'service_new',
    'New request: ' || v_label,
    new.event_name || ', ' || new.city || ' (' || new.event_start || ')',
    'service_new_staff', v_payload
  );
  return new;
end;
$$;

create trigger service_requests_created
after insert on public.service_requests
for each row execute function public.on_service_request_created();

-- ---------------------------------------------------------------------------
-- Client-callable workflow functions
-- ---------------------------------------------------------------------------

/**
 * Staff move requests through the workflow; requesters may accept a quote
 * or cancel an open request.
 */
create function public.transition_service_request(
  p_request uuid,
  p_to public.service_status,
  p_note text default null,
  p_quote_amount integer default null,
  p_quote_currency text default null,
  p_quote_note text default null
)
returns public.service_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.service_requests;
  v_actor uuid := auth.uid();
  v_staff boolean := public.is_staff();
  v_allowed public.service_status[];
  v_label text;
  v_payload jsonb;
begin
  select * into r from public.service_requests where id = p_request for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  if v_staff then
    v_allowed := case r.status
      when 'submitted' then array['under_review', 'declined']
      when 'under_review' then array['quoted', 'declined']
      when 'quoted' then array['quoted', 'confirmed', 'declined', 'expired']
      when 'accepted' then array['quoted', 'confirmed', 'declined']
      when 'confirmed' then array['completed', 'cancelled']
      else array[]::text[]
    end::public.service_status[];
  elsif r.requester_id = v_actor then
    v_allowed := case
      when r.status = 'quoted' then array['accepted', 'cancelled']
      when r.status in ('submitted', 'under_review', 'accepted') then array['cancelled']
      else array[]::text[]
    end::public.service_status[];
  else
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if not (p_to = any (v_allowed)) then
    raise exception 'invalid_transition' using errcode = '22023';
  end if;
  if char_length(p_note) > 2000 or char_length(p_quote_note) > 2000 then
    raise exception 'note_too_long' using errcode = '22001';
  end if;

  if p_to = 'quoted' then
    if p_quote_amount is null or p_quote_amount < 0 then
      raise exception 'quote_required' using errcode = '22023';
    end if;
    update public.service_requests
    set quote_amount = p_quote_amount,
        quote_currency = coalesce(upper(p_quote_currency), r.budget_currency),
        quote_note = nullif(trim(p_quote_note), '')
    where id = p_request;
  end if;

  update public.service_requests set status = p_to where id = p_request;
  insert into public.service_request_status_history (request_id, from_status, to_status, changed_by, note)
  values (p_request, r.status, p_to, v_actor, nullif(trim(p_note), ''));

  v_label := public.service_label(r.service_type);
  v_payload := jsonb_build_object(
    'reference', r.reference, 'service', v_label, 'event_name', r.event_name,
    'status', p_to, 'note', nullif(trim(p_note), ''),
    'quote_amount', case when p_to = 'quoted' then p_quote_amount end,
    'quote_currency', case when p_to = 'quoted'
      then coalesce(upper(p_quote_currency), r.budget_currency) end
  );

  if v_staff then
    perform public.queue_notification(
      r.requester_id, 'service_status',
      v_label || ' ' || r.reference || ': ' || replace(p_to::text, '_', ' '),
      r.event_name,
      '/dashboard/requests/' || p_request,
      'service_status', v_payload
    );
  else
    perform public.notify_service_staff(
      p_request, 'service_' || p_to::text,
      v_label || ' ' || r.reference || ': ' || p_to::text || ' by the requester',
      r.event_name,
      'service_status_staff', v_payload
    );
  end if;
  return p_to;
end;
$$;

create function public.add_service_request_message(
  p_request uuid,
  p_body text,
  p_internal boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.service_requests;
  v_actor uuid := auth.uid();
  v_staff boolean := public.is_staff();
  v_id uuid;
  v_body text := trim(p_body);
begin
  select * into r from public.service_requests where id = p_request;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if not v_staff and r.requester_id is distinct from v_actor then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_internal and not v_staff then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if char_length(v_body) not between 1 and 4000 then
    raise exception 'invalid_message' using errcode = '22023';
  end if;
  if (
    select count(*) from public.service_request_messages
    where author_id = v_actor and created_at > now() - interval '1 hour'
  ) >= 30 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.service_request_messages (request_id, author_id, body, internal)
  values (p_request, v_actor, v_body, p_internal)
  returning id into v_id;

  if not p_internal then
    if v_staff then
      perform public.queue_notification(
        r.requester_id, 'service_message',
        'New message about request ' || r.reference,
        left(v_body, 140),
        '/dashboard/requests/' || p_request,
        'service_message', jsonb_build_object('reference', r.reference, 'excerpt', left(v_body, 500))
      );
    else
      perform public.notify_service_staff(
        p_request, 'service_message',
        'Reply on request ' || r.reference,
        left(v_body, 140),
        'service_message_staff', jsonb_build_object('reference', r.reference, 'excerpt', left(v_body, 500))
      );
    end if;
  end if;
  return v_id;
end;
$$;

revoke execute on function
  public.transition_service_request(uuid, public.service_status, text, integer, text, text),
  public.add_service_request_message(uuid, text, boolean)
  from public, anon;
grant execute on function
  public.transition_service_request(uuid, public.service_status, text, integer, text, text),
  public.add_service_request_message(uuid, text, boolean)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.service_providers enable row level security;
alter table public.service_requests enable row level security;
alter table public.service_request_status_history enable row level security;
alter table public.service_request_messages enable row level security;

-- Providers are an internal directory for now.
create policy "service_providers: staff all" on public.service_providers
  for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "service_requests: requester read own" on public.service_requests
  for select to authenticated using (requester_id = (select auth.uid()));
create policy "service_requests: staff read all" on public.service_requests
  for select to authenticated using ((select public.is_staff()));
create policy "service_requests: requester create" on public.service_requests
  for insert to authenticated
  with check (
    requester_id = (select auth.uid())
    and status = 'submitted'
    and quote_amount is null
    and assigned_staff_id is null
    and assigned_provider_id is null
    and event_start >= current_date
  );
create policy "service_requests: staff assign" on public.service_requests
  for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "service_request_history: read with request" on public.service_request_status_history
  for select to authenticated
  using (exists (select 1 from public.service_requests r where r.id = request_id));

create policy "service_request_messages: read with request" on public.service_request_messages
  for select to authenticated
  using (
    exists (select 1 from public.service_requests r where r.id = request_id)
    and (not internal or (select public.is_staff()))
  );

revoke all on public.service_providers, public.service_requests,
  public.service_request_status_history, public.service_request_messages
  from anon, authenticated;

grant select, insert, update, delete on public.service_providers to authenticated;
grant select on public.service_requests, public.service_request_status_history,
  public.service_request_messages to authenticated;
grant insert (
  service_type, requester_id, organisation, event_name, event_start, event_end,
  city, country, venue_name, expected_attendance, budget_amount,
  budget_currency, message, details, contact_phone
) on public.service_requests to authenticated;
grant update (assigned_staff_id, assigned_provider_id) on public.service_requests to authenticated;
