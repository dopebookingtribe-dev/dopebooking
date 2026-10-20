-- Workflow and RLS tests for service requests. Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'promoter@example.test'),
  ('00000000-0000-0000-0000-0000000000b2', 'other@example.test'),
  ('00000000-0000-0000-0000-0000000000c3', 'staff@example.test');
insert into public.user_roles (user_id, role)
values ('00000000-0000-0000-0000-0000000000c3', 'staff');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok(
  $$insert into public.service_requests (id, service_type, requester_id, event_name, event_start, city, country, details)
    values ('60000000-0000-0000-0000-000000000001', 'catering', '00000000-0000-0000-0000-0000000000a1',
            'Forest Gathering', current_date + 30, 'Berlin', 'DE', '{"meals_per_day": 3}')$$,
  'requester can submit'
);
select throws_ok(
  $$insert into public.service_requests (service_type, requester_id, event_name, event_start, city, country, details)
    values ('catering', '00000000-0000-0000-0000-0000000000a1', 'Bad', current_date + 30, 'Berlin', 'DE', '[1,2]')$$,
  '23514', null, 'details must be an object'
);
select throws_ok(
  $$select public.transition_service_request('60000000-0000-0000-0000-000000000001', 'accepted')$$,
  '22023', null, 'cannot accept before a quote'
);
select is(
  (select count(*)::int from public.service_providers), 0,
  'requesters cannot read the provider directory'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select is((select count(*)::int from public.service_requests), 0, 'others see nothing');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';
select public.transition_service_request('60000000-0000-0000-0000-000000000001', 'under_review');
select public.transition_service_request('60000000-0000-0000-0000-000000000001', 'quoted', null, 4800, 'EUR', '3 days, 600 crew meals');
select lives_ok(
  $$insert into public.service_providers (name, services) values ('Green Kitchen', '{catering}')$$,
  'staff manage providers'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is(
  public.transition_service_request('60000000-0000-0000-0000-000000000001', 'accepted'),
  'accepted'::public.service_status, 'requester accepts the quote'
);
select throws_ok(
  $$select public.transition_service_request('60000000-0000-0000-0000-000000000001', 'confirmed')$$,
  '22023', null, 'requester cannot confirm'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';
select is(
  public.transition_service_request('60000000-0000-0000-0000-000000000001', 'confirmed'),
  'confirmed'::public.service_status, 'staff confirm after acceptance'
);
reset role;

select is(
  (select count(*)::int from public.service_request_status_history
   where request_id = '60000000-0000-0000-0000-000000000001'),
  5, 'every step is logged'
);

select * from finish();
rollback;
