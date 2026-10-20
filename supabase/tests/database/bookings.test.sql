-- Workflow and RLS tests for booking requests. Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'promoter@example.test'),
  ('00000000-0000-0000-0000-0000000000b2', 'other@example.test'),
  ('00000000-0000-0000-0000-0000000000c3', 'staff@example.test');
insert into public.user_roles (user_id, role)
values ('00000000-0000-0000-0000-0000000000c3', 'staff');
insert into public.artists (id, slug, stage_name, status) values
  ('10000000-0000-0000-0000-000000000001', 'live-act', 'Live Act', 'published'),
  ('10000000-0000-0000-0000-000000000002', 'secret-act', 'Secret Act', 'draft');

-- Promoter A submits a request.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select lives_ok(
  $$insert into public.booking_requests (id, artist_id, requester_id, event_name, event_date, city, country)
    values ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-0000000000a1', 'Forest Gathering', current_date + 60, 'Berlin', 'DE')$$,
  'promoter can request a published artist'
);
select throws_ok(
  $$insert into public.booking_requests (artist_id, requester_id, event_name, event_date, city, country)
    values ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1',
            'Secret', current_date + 60, 'Berlin', 'DE')$$,
  '42501', null, 'cannot request a draft artist'
);
select throws_ok(
  $$insert into public.booking_requests (artist_id, requester_id, event_name, event_date, city, country, status)
    values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1',
            'Sneaky', current_date + 60, 'Berlin', 'DE', 'confirmed')$$,
  '42501', null, 'cannot choose the status'
);
select throws_ok(
  $$update public.booking_requests set status = 'confirmed'
    where id = '50000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'cannot update status directly'
);
select throws_ok(
  $$select public.transition_booking('50000000-0000-0000-0000-000000000001', 'confirmed')$$,
  '22023', null, 'requester cannot confirm'
);
select throws_ok(
  $$select public.add_booking_message('50000000-0000-0000-0000-000000000001', 'secret', true)$$,
  '42501', null, 'requester cannot write internal notes'
);
select lives_ok(
  $$select public.add_booking_message('50000000-0000-0000-0000-000000000001', 'Can you play sunrise?')$$,
  'requester can message'
);
reset role;

select is(
  (select count(*)::int from public.booking_status_history where booking_id = '50000000-0000-0000-0000-000000000001'),
  1, 'creation writes the first history row'
);
select ok(
  (select count(*) from public.email_outbox where template = 'booking_new_staff') >= 1,
  'staff email queued for a new request'
);

-- Another user sees nothing.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select is((select count(*)::int from public.booking_requests), 0, 'others cannot see the request');
select is((select count(*)::int from public.booking_messages), 0, 'others cannot see messages');
reset role;

-- Staff work the request.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';
select public.transition_booking('50000000-0000-0000-0000-000000000001', 'under_review');
select throws_ok(
  $$select public.transition_booking('50000000-0000-0000-0000-000000000001', 'quoted')$$,
  '22023', null, 'a quote needs an amount'
);
select is(
  public.transition_booking('50000000-0000-0000-0000-000000000001', 'quoted', null, 2500, 'eur', 'Incl. travel'),
  'quoted'::public.booking_status, 'staff can quote'
);
select public.add_booking_message('50000000-0000-0000-0000-000000000001', 'Promoter seems solid', true);
reset role;

-- Requester sees the quote but not the internal note.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is(
  (select quote_amount from public.booking_requests where id = '50000000-0000-0000-0000-000000000001'),
  2500, 'requester sees the quote'
);
select is(
  (select count(*)::int from public.booking_messages where internal), 0,
  'requester cannot see internal notes'
);
reset role;

select * from finish();
rollback;
