-- Phase 05: booking requests, status history, messages, notifications and
-- the email outbox. See docs/PROJECT_ARCHITECTURE.md §5.4 and §5.8.
--
-- Status changes and messages go through security-definer functions that
-- validate the transition, write history and queue notifications. Clients
-- can never UPDATE status directly.

create type public.booking_status as enum (
  'submitted', 'under_review', 'quoted', 'negotiating', 'confirmed',
  'completed', 'declined', 'cancelled', 'expired'
);
create type public.email_status as enum ('pending', 'sending', 'sent', 'failed');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique
    default ('BK-' || upper(substr(md5(gen_random_uuid()::text), 1, 8))),
  artist_id uuid not null references public.artists (id) on delete restrict,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  organisation text check (char_length(organisation) <= 160),
  event_name text not null check (char_length(event_name) between 1 and 160),
  event_date date not null,
  city text not null check (char_length(city) between 1 and 80),
  country text not null check (country ~ '^[A-Z]{2}$'),
  venue_name text check (char_length(venue_name) <= 160),
  expected_attendance integer check (expected_attendance between 1 and 1000000),
  set_length_minutes integer check (set_length_minutes between 15 and 600),
  budget_amount integer check (budget_amount >= 0),
  budget_currency text not null default 'EUR' check (budget_currency ~ '^[A-Z]{3}$'),
  message text check (char_length(message) <= 4000),
  contact_phone text check (char_length(contact_phone) <= 32),        -- private
  contact_email text,             -- private; copied from the account on insert
  status public.booking_status not null default 'submitted',
  quote_amount integer check (quote_amount >= 0),
  quote_currency text check (quote_currency ~ '^[A-Z]{3}$'),
  quote_note text check (char_length(quote_note) <= 2000),
  assigned_staff_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index booking_requests_requester_idx on public.booking_requests (requester_id, created_at desc);
create index booking_requests_status_idx on public.booking_requests (status, created_at desc);
create index booking_requests_artist_idx on public.booking_requests (artist_id);

create table public.booking_status_history (
  id bigint generated always as identity primary key,
  booking_id uuid not null references public.booking_requests (id) on delete cascade,
  from_status public.booking_status,
  to_status public.booking_status not null,
  changed_by uuid references public.profiles (id) on delete set null,
  note text check (char_length(note) <= 2000),
  created_at timestamptz not null default now()
);

create index booking_status_history_booking_idx on public.booking_status_history (booking_id, created_at);

create table public.booking_messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.booking_requests (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(body) between 1 and 4000),
  internal boolean not null default false,   -- staff-only notes
  created_at timestamptz not null default now()
);

create index booking_messages_booking_idx on public.booking_messages (booking_id, created_at);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text check (link ~ '^/'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  template text not null,
  payload jsonb not null default '{}',
  status public.email_status not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  provider_message_id text,
  send_after timestamptz not null default now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index email_outbox_queue_idx on public.email_outbox (status, send_after);

create trigger booking_requests_set_updated_at
before update on public.booking_requests
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Internal helpers (not callable by clients)
-- ---------------------------------------------------------------------------

-- In-app notification plus, when a template is given, a queued email.
create function public.queue_notification(
  target uuid, kind text, title text, body text, link text,
  template text default null, payload jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  insert into public.notifications (user_id, type, title, body, link)
  values (target, kind, title, body, link);

  if template is not null then
    select email into v_email from auth.users where id = target;
    if v_email is not null then
      insert into public.email_outbox (to_email, template, payload)
      values (v_email, template, payload || jsonb_build_object('link', link, 'title', title));
    end if;
  end if;
end;
$$;

-- Notifies the assigned staff member, or every staff member if unassigned.
create function public.notify_booking_staff(
  p_booking uuid, kind text, title text, body text,
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
  v_link text := '/admin/bookings/' || p_booking;
begin
  select assigned_staff_id into v_assigned
  from public.booking_requests where id = p_booking;

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
  public.queue_notification(uuid, text, text, text, text, text, jsonb),
  public.notify_booking_staff(uuid, text, text, text, text, jsonb)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Triggers: limits and side effects of a new request
-- ---------------------------------------------------------------------------

-- At most 5 new requests per user per hour.
create function public.limit_booking_requests()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from public.booking_requests
    where requester_id = new.requester_id
      and created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger booking_requests_rate_limit
before insert on public.booking_requests
for each row execute function public.limit_booking_requests();

-- Staff reply to the account's real address, never a client-supplied one.
create function public.set_booking_contact_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select email into new.contact_email from auth.users where id = new.requester_id;
  return new;
end;
$$;

create trigger booking_requests_contact_email
before insert on public.booking_requests
for each row execute function public.set_booking_contact_email();

create function public.on_booking_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artist text;
  v_payload jsonb;
begin
  select stage_name into v_artist from public.artists where id = new.artist_id;
  v_payload := jsonb_build_object(
    'reference', new.reference,
    'artist', v_artist,
    'event_name', new.event_name,
    'event_date', new.event_date,
    'city', new.city
  );

  insert into public.booking_status_history (booking_id, from_status, to_status, changed_by)
  values (new.id, null, 'submitted', new.requester_id);

  perform public.queue_notification(
    new.requester_id, 'booking_received',
    'Booking request ' || new.reference || ' received',
    'We''ll review your request for ' || v_artist || ' and reply soon.',
    '/dashboard/bookings/' || new.id,
    'booking_received', v_payload
  );
  perform public.notify_booking_staff(
    new.id, 'booking_new',
    'New booking request: ' || v_artist,
    new.event_name || ', ' || new.city || ' (' || new.event_date || ')',
    'booking_new_staff', v_payload
  );
  return new;
end;
$$;

create trigger booking_requests_created
after insert on public.booking_requests
for each row execute function public.on_booking_created();

-- ---------------------------------------------------------------------------
-- Client-callable functions
-- ---------------------------------------------------------------------------

/**
 * Moves a booking to a new status if the caller may do so:
 * staff follow the workflow below; requesters may only cancel open requests.
 */
create function public.transition_booking(
  p_booking uuid,
  p_to public.booking_status,
  p_note text default null,
  p_quote_amount integer default null,
  p_quote_currency text default null,
  p_quote_note text default null
)
returns public.booking_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.booking_requests;
  v_actor uuid := auth.uid();
  v_staff boolean := public.is_staff();
  v_allowed public.booking_status[];
  v_artist text;
  v_payload jsonb;
begin
  select * into b from public.booking_requests where id = p_booking for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  if v_staff then
    v_allowed := case b.status
      when 'submitted' then array['under_review', 'declined']
      when 'under_review' then array['quoted', 'declined']
      when 'quoted' then array['quoted', 'negotiating', 'confirmed', 'declined', 'expired']
      when 'negotiating' then array['quoted', 'confirmed', 'declined']
      when 'confirmed' then array['completed', 'cancelled']
      else array[]::text[]
    end::public.booking_status[];
  elsif b.requester_id = v_actor then
    v_allowed := case
      when b.status in ('submitted', 'under_review', 'quoted', 'negotiating')
        then array['cancelled']::public.booking_status[]
      else array[]::public.booking_status[]
    end;
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
    update public.booking_requests
    set quote_amount = p_quote_amount,
        quote_currency = coalesce(upper(p_quote_currency), b.budget_currency),
        quote_note = nullif(trim(p_quote_note), '')
    where id = p_booking;
  end if;

  update public.booking_requests set status = p_to where id = p_booking;
  insert into public.booking_status_history (booking_id, from_status, to_status, changed_by, note)
  values (p_booking, b.status, p_to, v_actor, nullif(trim(p_note), ''));

  select stage_name into v_artist from public.artists where id = b.artist_id;
  v_payload := jsonb_build_object(
    'reference', b.reference, 'artist', v_artist, 'event_name', b.event_name,
    'status', p_to, 'note', nullif(trim(p_note), ''),
    'quote_amount', case when p_to = 'quoted' then p_quote_amount end,
    'quote_currency', case when p_to = 'quoted'
      then coalesce(upper(p_quote_currency), b.budget_currency) end
  );

  if v_staff then
    perform public.queue_notification(
      b.requester_id, 'booking_status',
      'Booking ' || b.reference || ': ' || replace(p_to::text, '_', ' '),
      v_artist || ' · ' || b.event_name,
      '/dashboard/bookings/' || p_booking,
      'booking_status', v_payload
    );
  else
    perform public.notify_booking_staff(
      p_booking, 'booking_cancelled',
      'Booking ' || b.reference || ' cancelled by the requester',
      v_artist || ' · ' || b.event_name,
      'booking_status_staff', v_payload
    );
  end if;

  return p_to;
end;
$$;

/** Adds a message (requester or staff) or an internal note (staff only). */
create function public.add_booking_message(
  p_booking uuid,
  p_body text,
  p_internal boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.booking_requests;
  v_actor uuid := auth.uid();
  v_staff boolean := public.is_staff();
  v_id uuid;
  v_body text := trim(p_body);
begin
  select * into b from public.booking_requests where id = p_booking;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if not v_staff and b.requester_id is distinct from v_actor then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_internal and not v_staff then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if char_length(v_body) not between 1 and 4000 then
    raise exception 'invalid_message' using errcode = '22023';
  end if;

  -- At most 30 messages per author per hour.
  if (
    select count(*) from public.booking_messages
    where author_id = v_actor and created_at > now() - interval '1 hour'
  ) >= 30 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.booking_messages (booking_id, author_id, body, internal)
  values (p_booking, v_actor, v_body, p_internal)
  returning id into v_id;

  if not p_internal then
    if v_staff then
      perform public.queue_notification(
        b.requester_id, 'booking_message',
        'New message about booking ' || b.reference,
        left(v_body, 140),
        '/dashboard/bookings/' || p_booking,
        'booking_message', jsonb_build_object('reference', b.reference, 'excerpt', left(v_body, 500))
      );
    else
      perform public.notify_booking_staff(
        p_booking, 'booking_message',
        'Reply on booking ' || b.reference,
        left(v_body, 140),
        'booking_message_staff', jsonb_build_object('reference', b.reference, 'excerpt', left(v_body, 500))
      );
    end if;
  end if;

  return v_id;
end;
$$;

revoke execute on function
  public.transition_booking(uuid, public.booking_status, text, integer, text, text),
  public.add_booking_message(uuid, text, boolean)
  from public, anon;
grant execute on function
  public.transition_booking(uuid, public.booking_status, text, integer, text, text),
  public.add_booking_message(uuid, text, boolean)
  to authenticated;

-- Email worker: claims a batch to send (service role only).
create function public.claim_email_batch(p_limit integer default 20)
returns setof public.email_outbox
language sql
security definer
set search_path = ''
as $$
  update public.email_outbox
  set status = 'sending', attempts = attempts + 1, claimed_at = now()
  where id in (
    select id from public.email_outbox
    where attempts < 5
      and send_after <= now()
      and (
        status in ('pending', 'failed')
        -- reclaim sends that crashed mid-flight
        or (status = 'sending' and claimed_at < now() - interval '15 minutes')
      )
    order by created_at
    limit least(p_limit, 100)
    for update skip locked
  )
  returning *;
$$;

revoke execute on function public.claim_email_batch(integer) from public, anon, authenticated;
grant execute on function public.claim_email_batch(integer) to service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.booking_requests enable row level security;
alter table public.booking_status_history enable row level security;
alter table public.booking_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.email_outbox enable row level security;

create policy "booking_requests: requester read own" on public.booking_requests
  for select to authenticated using (requester_id = (select auth.uid()));
create policy "booking_requests: staff read all" on public.booking_requests
  for select to authenticated using ((select public.is_staff()));
create policy "booking_requests: requester create" on public.booking_requests
  for insert to authenticated
  with check (
    requester_id = (select auth.uid())
    and status = 'submitted'
    and quote_amount is null
    and assigned_staff_id is null
    and event_date >= current_date
    and (select public.is_published_artist(artist_id))
  );
-- Staff may change the assignment only (column grant below).
create policy "booking_requests: staff assign" on public.booking_requests
  for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create policy "booking_status_history: read with booking" on public.booking_status_history
  for select to authenticated
  using (exists (select 1 from public.booking_requests b where b.id = booking_id));

create policy "booking_messages: read with booking" on public.booking_messages
  for select to authenticated
  using (
    exists (select 1 from public.booking_requests b where b.id = booking_id)
    and (not internal or (select public.is_staff()))
  );

create policy "notifications: read own" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications: mark own read" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- No policies on email_outbox: only the service role (worker) touches it.

revoke all on public.booking_requests, public.booking_status_history,
  public.booking_messages, public.notifications, public.email_outbox
  from anon, authenticated;

grant select on public.booking_requests, public.booking_status_history,
  public.booking_messages, public.notifications
  to authenticated;
grant insert (
  artist_id, requester_id, organisation, event_name, event_date, city, country,
  venue_name, expected_attendance, set_length_minutes, budget_amount,
  budget_currency, message, contact_phone
) on public.booking_requests to authenticated;
grant update (assigned_staff_id) on public.booking_requests to authenticated;
grant update (read_at) on public.notifications to authenticated;
