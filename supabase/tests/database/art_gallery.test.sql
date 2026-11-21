-- RLS and integrity tests for the Art Gallery.
-- Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into public.art_artists (id, slug, name, kind, status) values
  ('a0000000-0000-0000-0000-000000000001', 'ana', 'Ana', 'individual', 'published'),
  ('a0000000-0000-0000-0000-000000000002', 'ben', 'Ben', 'individual', 'published'),
  ('a0000000-0000-0000-0000-000000000003', 'cy', 'Cy', 'individual', 'draft'),
  ('a0000000-0000-0000-0000-000000000004', 'crew', 'Crew', 'collective', 'published');
insert into public.art_collective_members (collective_id, member_id) values
  ('a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001');
insert into public.art_festivals (id, slug, name) values
  ('f0000000-0000-0000-0000-000000000001', 'shown', 'Shown'),
  ('f0000000-0000-0000-0000-000000000002', 'unshown', 'Unshown');
insert into public.art_exhibitions (id, slug, title, festival_id, starts_on, ends_on, status) values
  ('e0000000-0000-0000-0000-000000000001', 'live', 'Live', 'f0000000-0000-0000-0000-000000000001', '2027-07-01', '2027-07-05', 'published'),
  ('e0000000-0000-0000-0000-000000000002', 'draft', 'Draft', 'f0000000-0000-0000-0000-000000000002', null, null, 'draft');
insert into public.art_exhibition_artists (exhibition_id, art_artist_id, roles) values
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '{curator,live_painter}'),
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', '{artist}');
insert into public.art_artworks (id, slug, title, status) values
  ('b0000000-0000-0000-0000-000000000001', 'work', 'Work', 'published');
insert into public.art_artwork_credits (artwork_id, art_artist_id) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002');
insert into public.media_assets (art_exhibition_id, storage_path, alt_text, art_collection) values
  ('e0000000-0000-0000-0000-000000000001', 'art-exhibitions/a/1.jpg', 'Installation', 'installation'),
  ('e0000000-0000-0000-0000-000000000002', 'art-exhibitions/b/1.jpg', 'Hidden', null);

select throws_ok(
  $$insert into public.art_artists (slug, name, disciplines) values ('x', 'X', '{knitting}')$$,
  '23514', null, 'disciplines come from the fixed list'
);
select throws_ok(
  $$update public.art_exhibition_artists set roles = '{boss}'$$,
  '23514', null, 'exhibition roles come from the fixed list'
);
select throws_ok(
  $$update public.art_exhibitions set ends_on = '2020-01-01' where slug = 'live'$$,
  '23514', null, 'exhibitions cannot close before they open'
);
select throws_ok(
  $$insert into public.art_collective_members (collective_id, member_id)
    values ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002')$$,
  '23514', null, 'only collectives have members'
);
select throws_ok(
  $$insert into public.media_assets (art_artist_id, art_artwork_id, storage_path, alt_text)
    values ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'x/y.jpg', 'Two owners')$$,
  '23514', null, 'an art image has exactly one owner'
);
select is(public.service_label('art_gallery'), 'Art gallery collaboration', 'inquiries have a label');

set local role anon;
select is((select count(*)::int from public.art_artists), 3, 'anon sees published artists only');
select is((select count(*)::int from public.art_exhibitions), 1, 'anon sees published exhibitions only');
select is((select count(*)::int from public.art_festivals), 1, 'festivals are public only through a published exhibition');
select is((select count(*)::int from public.art_exhibition_artists), 1, 'line-ups hide draft artists');
select is((select count(*)::int from public.art_artwork_credits), 2, 'credits of published artists are public');
select is((select count(*)::int from public.media_assets where art_exhibition_id is not null), 1, 'art photos follow their owner');
select throws_ok($$select created_by from public.art_artists$$, '42501', null, 'anon cannot read internal account ids');
select throws_ok(
  $$insert into public.art_artists (slug, name) values ('y', 'Y')$$,
  '42501', null, 'anon cannot create artists'
);
reset role;

select * from finish();
rollback;
