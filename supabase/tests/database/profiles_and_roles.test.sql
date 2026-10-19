-- RLS tests for profiles and user_roles. Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

-- Fixtures (as postgres): two users, B becomes admin.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@example.test', '{"display_name":"Alpha"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@example.test', '{}');

select is(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  'Alpha',
  'signup trigger creates a profile with the display name'
);
select is(
  (select array_agg(role)::text from public.user_roles where user_id = '00000000-0000-0000-0000-0000000000a1'),
  '{customer}',
  'signup trigger grants the customer role'
);

insert into public.user_roles (user_id, role)
values ('00000000-0000-0000-0000-0000000000b2', 'admin');

-- Anonymous visitors see nothing.
set local role anon;
select throws_ok(
  'select count(*) from public.profiles',
  '42501',
  null,
  'anon has no access to profiles'
);
reset role;

-- User A (customer).
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select is((select count(*)::int from public.profiles), 1, 'customer sees only their own profile');
select is((select count(*)::int from public.user_roles), 1, 'customer sees only their own roles');

select throws_ok(
  $$insert into public.user_roles (user_id, role, granted_by)
    values ('00000000-0000-0000-0000-0000000000a1', 'admin', '00000000-0000-0000-0000-0000000000a1')$$,
  '42501',
  null,
  'customer cannot grant themselves admin'
);

update public.profiles set display_name = 'Alpha Renamed'
where id = '00000000-0000-0000-0000-0000000000a1';
update public.profiles set display_name = 'Hijacked'
where id = '00000000-0000-0000-0000-0000000000b2';

select throws_ok(
  $$update public.profiles set created_at = now() where id = '00000000-0000-0000-0000-0000000000a1'$$,
  '42501',
  null,
  'customer cannot edit protected profile columns'
);
reset role;

select is(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-0000000000b2'),
  null,
  'customer cannot edit another profile'
);

-- User B (admin).
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';

select is((select count(*)::int from public.profiles), 2, 'admin reads all profiles');

select lives_ok(
  $$insert into public.user_roles (user_id, role, granted_by)
    values ('00000000-0000-0000-0000-0000000000a1', 'staff', '00000000-0000-0000-0000-0000000000b2')$$,
  'admin can grant staff'
);

delete from public.user_roles
where user_id = '00000000-0000-0000-0000-0000000000b2' and role = 'admin';
reset role;

select is(
  (select count(*)::int from public.user_roles
   where user_id = '00000000-0000-0000-0000-0000000000b2' and role = 'admin'),
  1,
  'admin cannot remove their own admin role'
);

select * from finish();
rollback;
