-- Music marketplace: who may edit, publish, see masters, earn and withdraw.
-- Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@example.test'),
  ('00000000-0000-0000-0000-0000000000b2', 'staff@example.test'),
  ('00000000-0000-0000-0000-0000000000c3', 'artist-a@example.test'),
  ('00000000-0000-0000-0000-0000000000d4', 'artist-b@example.test');
insert into public.user_roles (user_id, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin'),
  ('00000000-0000-0000-0000-0000000000b2', 'staff');
insert into public.artists (id, slug, stage_name, status) values
  ('a0000000-0000-0000-0000-000000000001', 'artist-a', 'Artist A', 'published'),
  ('b0000000-0000-0000-0000-000000000001', 'artist-b', 'Artist B', 'published');
insert into public.artist_members (artist_id, user_id) values
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c3'),
  ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d4');

-- Artist A drafts a release; drafts only, own artist only.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';
select lives_ok(
  $$insert into public.music_releases (id, artist_id, slug, title, price_amount, genre_id)
    values ('11111111-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
            'first', 'First', 1000, (select id from public.music_genres where slug = 'psytrance'))$$,
  'artists create drafts'
);
select throws_ok(
  $$insert into public.music_releases (artist_id, slug, title, status)
    values ('a0000000-0000-0000-0000-000000000001', 'x', 'X', 'published')$$,
  '42501', null, 'artists cannot create live releases'
);
select throws_ok(
  $$insert into public.music_releases (artist_id, slug, title)
    values ('b0000000-0000-0000-0000-000000000001', 'y', 'Y')$$,
  '42501', null, 'artists cannot create releases for other artists'
);
select throws_ok(
  $$select public.submit_music_release('11111111-0000-0000-0000-000000000001', true)$$,
  '22023', null, 'releases need artwork and tracks before review'
);
insert into public.media_assets (music_release_id, storage_path, alt_text)
  values ('11111111-0000-0000-0000-000000000001', 'music/11111111-0000-0000-0000-000000000001/c.webp', 'Cover');
update public.music_releases
   set cover_asset_id = (select id from public.media_assets where music_release_id = '11111111-0000-0000-0000-000000000001');
insert into public.music_tracks (id, release_id, position, title, preview_path)
  values ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 1, 'One',
          'releases/11111111-0000-0000-0000-000000000001/p.wav');
insert into public.music_track_files (track_id, format, storage_path, size_bytes)
  values ('22222222-0000-0000-0000-000000000001', 'flac', 'releases/11111111-0000-0000-0000-000000000001/t.flac', 1000);
select lives_ok(
  $$select public.submit_music_release('11111111-0000-0000-0000-000000000001', true)$$,
  'complete releases go to review'
);
select throws_ok(
  $$update public.music_releases set title = 'Changed' where id = '11111111-0000-0000-0000-000000000001'$$,
  '42501', null, 'nothing changes while in review'
);
select throws_ok(
  $$select public.review_music_release('11111111-0000-0000-0000-000000000001', 'published')$$,
  '42501', null, 'artists cannot publish themselves'
);
select throws_ok(
  $$insert into public.notifications (user_id, type, title) values ('00000000-0000-0000-0000-0000000000c3', 'x', 'x')$$,
  '42501', null, 'users cannot write notifications'
);
reset role;

set local role anon;
select is((select count(*)::int from public.music_releases), 0, 'visitors do not see releases in review');
reset role;

-- Staff publish; visitors see the release but never the masters.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select lives_ok(
  $$select public.review_music_release('11111111-0000-0000-0000-000000000001', 'published')$$,
  'staff publish releases'
);
-- Blocked updates match no rows rather than raising an error.
update public.platform_settings set value = '{"commission_bps":0}' where key = 'music';
reset role;
select is(
  (select (value ->> 'commission_bps')::int from public.platform_settings where key = 'music'), 1500,
  'staff cannot change music commission'
);

set local role anon;
select is((select count(*)::int from public.music_tracks), 1, 'visitors see published tracks');
select throws_ok('select * from public.music_track_files', '42501', null, 'visitors cannot read masters');
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d4","role":"authenticated"}';
select is((select count(*)::int from public.music_track_files), 0, 'other artists cannot see masters');
update public.music_releases set price_amount = 50 where id = '11111111-0000-0000-0000-000000000001';
reset role;
select is(
  (select price_amount from public.music_releases where id = '11111111-0000-0000-0000-000000000001'), 1000,
  'other artists cannot change the price'
);

-- A paid order (as the webhook does it) credits the artist once.
insert into public.orders (id, buyer_id, currency, items_total, shipping_total, total, access_token_hash, status, paid_at)
  values ('33333333-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d4', 'EUR', 1000, 0, 1000, 'x', 'paid', now());
insert into public.order_items (id, order_id, product_title, variant_name, product_type, unit_price, quantity, line_total,
                                music_release_id, artist_id, commission_bps, commission_amount, artist_amount)
  values ('44444444-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'First', 'Artist A', 'digital',
          1000, 1, 1000, '11111111-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 1500, 150, 850);
select public.credit_music_sales('33333333-0000-0000-0000-000000000001');
select public.credit_music_sales('33333333-0000-0000-0000-000000000001');
select is(
  (select count(*)::int from public.artist_ledger where entry_type = 'sale'), 1,
  'a repeated webhook credits once'
);
select is((select count(*)::int from public.music_entitlements), 1, 'the buyer can download');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';
select is(
  (select (pending, available) from public.artist_balance('a0000000-0000-0000-0000-000000000001'))::text,
  '(850,0)', 'new earnings wait for the hold period'
);
select throws_ok(
  $$insert into public.artist_ledger (artist_id, entry_type, amount) values ('a0000000-0000-0000-0000-000000000001', 'adjustment', 100000)$$,
  '42501', null, 'artists cannot write their own ledger'
);
reset role;

-- After the hold, the artist withdraws; finance decides.
update public.artist_ledger set available_at = now() - interval '1 day';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';
select throws_ok(
  $$select public.request_withdrawal('a0000000-0000-0000-0000-000000000001', 850)$$,
  '22023', null, 'payouts need bank details'
);
insert into public.artist_payout_details (artist_id, account_holder, iban)
  values ('a0000000-0000-0000-0000-000000000001', 'Artist A', 'DE89370400440532013000');
select throws_ok(
  $$select public.request_withdrawal('a0000000-0000-0000-0000-000000000001', 850)$$,
  '22023', null, 'payouts respect the minimum'
);
reset role;
update public.platform_settings set value = '{"commission_bps":1500,"hold_days":14,"min_withdrawal":500}' where key = 'music';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';
select lives_ok(
  $$select public.request_withdrawal('a0000000-0000-0000-0000-000000000001', 850)$$,
  'artists request payouts of available money'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select throws_ok(
  $$select public.decide_withdrawal((select id from public.artist_withdrawals), 'paid', null, 'REF1')$$,
  '42501', null, 'only finance can pay out'
);
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok(
  $$select public.decide_withdrawal((select id from public.artist_withdrawals), 'paid', null, 'REF1')$$,
  'finance marks payouts paid with a bank reference'
);
reset role;

-- A full refund takes the share back and ends download access.
update public.orders set refunded_amount = 1000, status = 'refunded' where id = '33333333-0000-0000-0000-000000000001';
select public.sync_music_refunds('33333333-0000-0000-0000-000000000001');
select is(
  (select -sum(amount)::int from public.artist_ledger where entry_type = 'refund'), 850,
  'refunds take back the artist share'
);
select ok(
  (select revoked_at is not null from public.music_entitlements),
  'refunded music can no longer be downloaded'
);

select * from finish();
rollback;
