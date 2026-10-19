-- RLS tests for artists and related tables. Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

-- Fixtures (as postgres): customer A, staff S, member M; one published and
-- one draft artist, each with private info, a link and an image.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@example.test'),
  ('00000000-0000-0000-0000-0000000000c3', 's@example.test'),
  ('00000000-0000-0000-0000-0000000000d4', 'm@example.test');
insert into public.user_roles (user_id, role)
values ('00000000-0000-0000-0000-0000000000c3', 'staff');

insert into public.artists (id, slug, stage_name, status, genres) values
  ('10000000-0000-0000-0000-000000000001', 'live-act', 'Live Act', 'published', '{progressive}'),
  ('10000000-0000-0000-0000-000000000002', 'secret-act', 'Secret Act', 'draft', '{dark}');
insert into public.artist_members (artist_id, user_id)
values ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000d4');
insert into public.artist_private (artist_id, fee_min, fee_max) values
  ('10000000-0000-0000-0000-000000000001', 1000, 2000),
  ('10000000-0000-0000-0000-000000000002', 3000, 4000);
insert into public.artist_links (artist_id, platform, url) values
  ('10000000-0000-0000-0000-000000000001', 'soundcloud', 'https://soundcloud.com/live'),
  ('10000000-0000-0000-0000-000000000002', 'soundcloud', 'https://soundcloud.com/secret');
insert into public.media_assets (artist_id, storage_path, alt_text) values
  ('10000000-0000-0000-0000-000000000001', 'artists/live/1.jpg', 'Live'),
  ('10000000-0000-0000-0000-000000000002', 'artists/secret/1.jpg', 'Secret');

select isnt(
  (select published_at from public.artists where slug = 'live-act'), null,
  'publishing sets published_at'
);
select throws_ok(
  $$insert into public.artists (slug, stage_name, genres) values ('x', 'X', '{polka}')$$,
  '23514', null, 'unknown genres are rejected'
);

-- Anonymous visitor
set local role anon;
select is((select count(*)::int from public.artists), 1, 'anon sees only published artists');
select is((select count(*)::int from public.artist_links), 1, 'anon sees links of published artists only');
select is((select count(*)::int from public.media_assets), 1, 'anon sees media of published artists only');
select throws_ok('select * from public.artist_private', '42501', null, 'anon cannot read private artist info');
reset role;

-- Customer A
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select is((select count(*)::int from public.artist_private), 0, 'customer sees no private artist info');
select throws_ok(
  $$insert into public.artists (slug, stage_name) values ('mine', 'Mine')$$,
  '42501', null, 'customer cannot create artists'
);
update public.artists set stage_name = 'Hacked' where slug = 'live-act';
reset role;
select is(
  (select stage_name from public.artists where slug = 'live-act'), 'Live Act',
  'customer cannot edit artists'
);

-- Member M of the draft artist
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d4","role":"authenticated"}';
select is(
  (select array_agg(slug order by slug)::text from public.artists),
  '{live-act,secret-act}',
  'member sees their own draft artist'
);
select is((select count(*)::int from public.artist_private), 1, 'member sees only their artist''s private info');
reset role;

-- Staff S
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';
select is((select count(*)::int from public.artist_private), 2, 'staff see all private artist info');
reset role;

select * from finish();
rollback;
