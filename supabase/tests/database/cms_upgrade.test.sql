-- Admin CMS upgrade (20261122000100): library files, file videos, staff
-- product management, news visibility, artist availability, press kits and
-- the admin lock-out guard. Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@example.test'),
  ('00000000-0000-0000-0000-0000000000b2', 'staff@example.test'),
  ('00000000-0000-0000-0000-0000000000c3', 'user@example.test'),
  ('00000000-0000-0000-0000-0000000000d4', 'seller@example.test');
insert into public.user_roles (user_id, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin'),
  ('00000000-0000-0000-0000-0000000000b2', 'staff');

insert into public.artists (id, slug, stage_name, status) values
  ('10000000-0000-0000-0000-000000000001', 'nova', 'Nova', 'published'),
  ('10000000-0000-0000-0000-000000000002', 'hidden', 'Hidden', 'draft');
insert into public.media_assets (id, library, type, storage_bucket, storage_path, alt_text, mime_type) values
  ('20000000-0000-0000-0000-000000000001', 'site', 'video', 'site-files', 'library/videos/a.mp4', 'Aftermovie', 'video/mp4'),
  ('20000000-0000-0000-0000-000000000002', 'site', 'document', 'site-files', 'library/documents/kit.pdf', 'Press kit', 'application/pdf');
insert into public.sellers (id, owner_user_id, slug, display_name, status) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d4', 'shop', 'Shop', 'approved');

-- Media library
select throws_ok(
  $$insert into public.media_assets (artist_id, type, storage_path, alt_text)
    values ('10000000-0000-0000-0000-000000000001', 'video', 'artists/x/v.mp4', 'v')$$,
  '23514', null, 'videos, audio and documents live in the library only'
);
select is(
  (select file_size_limit from storage.buckets where id = 'site-files'), 52428800::bigint,
  'site-files bucket takes up to 50 MB'
);

-- Videos
select throws_ok(
  $$insert into public.videos (slug, title, provider, provider_ref) values ('v1', 'V1', 'file', 'abc')$$,
  '23514', null, 'a file video needs its library asset'
);
select lives_ok(
  $$insert into public.videos (slug, title, provider, provider_ref, file_asset_id, status)
    values ('v2', 'V2', 'file', '20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'published')$$,
  'a file video plays a library asset'
);
select throws_ok(
  $$delete from public.media_assets where id = '20000000-0000-0000-0000-000000000001'$$,
  '23503', null, 'a playing file cannot be deleted'
);

-- News
insert into public.posts (slug, title, status, published_at) values
  ('live', 'Live', 'published', now() - interval '1 hour'),
  ('later', 'Later', 'published', now() + interval '2 days'),
  ('draft', 'Draft', 'draft', null);
set local role anon;
select is((select array_agg(slug) from public.posts), '{live}', 'visitors see only published, past posts');
select throws_ok('select created_by from public.posts', '42501', null, 'visitors cannot read created_by');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';
select throws_ok(
  $$insert into public.posts (slug, title) values ('x', 'X')$$,
  '42501', null, 'plain users cannot write posts'
);
select throws_ok(
  $$insert into public.products (seller_id, slug, title) values ('30000000-0000-0000-0000-000000000001', 'p0', 'P0')$$,
  '42501', null, 'plain users cannot create products'
);
select throws_ok(
  $$insert into public.artist_availability (artist_id, starts_on, ends_on)
    values ('10000000-0000-0000-0000-000000000001', '2027-03-05', '2027-03-06')$$,
  '42501', null, 'plain users cannot add availability'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select is((select count(*)::int from public.posts), 3, 'staff see drafts and scheduled posts');
select lives_ok(
  $$insert into public.products (id, seller_id, slug, title)
    values ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'p1', 'P1')$$,
  'staff create products for a shop'
);
select lives_ok(
  $$insert into public.product_variants (product_id, name, price_amount, stock)
    values ('40000000-0000-0000-0000-000000000001', 'M', 2500, 4)$$,
  'staff manage options and stock'
);
with deleted as (
  delete from public.products where id = '40000000-0000-0000-0000-000000000001' returning 1
)
select is((select count(*)::int from deleted), 1, 'staff delete products without orders');
select lives_ok(
  $$insert into public.artist_availability (artist_id, starts_on, ends_on, status, is_public, location) values
    ('10000000-0000-0000-0000-000000000001', '2027-03-01', '2027-03-20', 'touring', true, 'Brazil'),
    ('10000000-0000-0000-0000-000000000001', '2027-04-01', '2027-04-05', 'booked', false, null),
    ('10000000-0000-0000-0000-000000000002', '2027-03-01', '2027-03-02', 'available', true, null)$$,
  'staff add availability'
);
reset role;

set local role anon;
select is(
  (select array_agg(location) from public.artist_availability), '{Brazil}',
  'visitors see public windows of published artists only'
);
reset role;

select throws_ok(
  $$insert into public.artist_availability (artist_id, starts_on, ends_on)
    values ('10000000-0000-0000-0000-000000000001', '2027-03-05', '2027-03-01')$$,
  '23514', null, 'a window cannot end before it starts'
);

update public.artists set press_kit_asset_id = '20000000-0000-0000-0000-000000000002'
  where id = '10000000-0000-0000-0000-000000000001';
select throws_ok(
  $$delete from public.media_assets where id = '20000000-0000-0000-0000-000000000002'$$,
  '23503', null, 'a press kit in use cannot be deleted'
);

-- Permissions: nobody can lock the owner out.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select throws_ok(
  $$delete from public.role_permissions where role = 'admin' and permission = 'users.manage'$$,
  '42501', null, 'the admin role always keeps users.manage'
);
select lives_ok(
  $$insert into public.role_permissions (role, permission) values ('staff', 'pages.publish')$$,
  'admins can widen the staff role'
);
reset role;

select * from finish();
rollback;
