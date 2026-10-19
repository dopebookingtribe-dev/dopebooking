-- RLS tests for events, lineups, galleries, videos and their media.
-- Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into public.artists (id, slug, stage_name, status) values
  ('10000000-0000-0000-0000-000000000001', 'live-act', 'Live Act', 'published'),
  ('10000000-0000-0000-0000-000000000002', 'secret-act', 'Secret Act', 'draft');
insert into public.events (id, slug, title, starts_at, status) values
  ('20000000-0000-0000-0000-000000000001', 'open-air', 'Open Air', now() + interval '30 days', 'published'),
  ('20000000-0000-0000-0000-000000000002', 'secret-party', 'Secret', now() + interval '60 days', 'draft');
insert into public.event_artists (event_id, artist_id) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002');
insert into public.galleries (id, slug, title, status) values
  ('30000000-0000-0000-0000-000000000001', 'open-air-2026', 'Open Air 2026', 'published'),
  ('30000000-0000-0000-0000-000000000002', 'unreleased', 'Unreleased', 'draft');
insert into public.videos (id, slug, title, provider, provider_ref, status) values
  ('40000000-0000-0000-0000-000000000001', 'aftermovie', 'Aftermovie', 'youtube', 'dQw4w9WgXcQ', 'published'),
  ('40000000-0000-0000-0000-000000000002', 'teaser', 'Teaser', 'mux', 'abc123', 'draft');
insert into public.media_assets (gallery_id, storage_path, alt_text) values
  ('30000000-0000-0000-0000-000000000001', 'galleries/a/1.jpg', 'Crowd'),
  ('30000000-0000-0000-0000-000000000002', 'galleries/b/1.jpg', 'Hidden');

select throws_ok(
  $$insert into public.media_assets (gallery_id, event_id, storage_path, alt_text)
    values ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'x/y.jpg', 'Two owners')$$,
  '23514', null, 'a media asset has exactly one owner'
);
select throws_ok(
  $$insert into public.events (slug, title, starts_at, ends_at)
    values ('backwards', 'Backwards', now(), now() - interval '1 day')$$,
  '23514', null, 'events cannot end before they start'
);
select throws_ok(
  $$insert into public.videos (slug, title, provider, provider_ref)
    values ('bad', 'Bad', 'youtube', '"><script>')$$,
  '23514', null, 'video references are restricted to safe characters'
);

set local role anon;
select is((select count(*)::int from public.events), 1, 'anon sees published events only');
select is((select count(*)::int from public.event_artists), 1, 'lineup hides draft artists');
select is((select count(*)::int from public.galleries), 1, 'anon sees published galleries only');
select is((select count(*)::int from public.videos), 1, 'anon sees published videos only');
select is((select count(*)::int from public.media_assets), 1, 'anon sees photos of published galleries only');
select throws_ok(
  $$insert into public.events (slug, title, starts_at) values ('x', 'X', now())$$,
  '42501', null, 'anon cannot create events'
);
reset role;

select * from finish();
rollback;
