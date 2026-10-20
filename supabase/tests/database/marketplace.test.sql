-- RLS tests for sellers and products. Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'seller@example.test'),
  ('00000000-0000-0000-0000-0000000000b2', 'buyer@example.test'),
  ('00000000-0000-0000-0000-0000000000c3', 'staff@example.test');
insert into public.user_roles (user_id, role)
values ('00000000-0000-0000-0000-0000000000c3', 'staff');

-- Seller A applies.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok(
  $$insert into public.sellers (id, owner_user_id, slug, display_name)
    values ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'goa-gear', 'Goa Gear')$$,
  'a user can apply to sell'
);
select throws_ok(
  $$insert into public.products (seller_id, slug, title) values ('70000000-0000-0000-0000-000000000001', 'tee', 'Tee')$$,
  '42501', null, 'pending sellers cannot list products'
);
select throws_ok(
  $$update public.sellers set status = 'approved' where id = '70000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'sellers cannot approve themselves'
);
reset role;

-- Staff approve.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';
select is(
  public.review_seller('70000000-0000-0000-0000-000000000001', 'approved', 'Welcome'),
  'approved'::public.seller_status, 'staff approve the seller'
);
reset role;
select ok(
  exists (select 1 from public.user_roles where user_id = '00000000-0000-0000-0000-0000000000a1' and role = 'seller'),
  'approval grants the seller role'
);

-- Seller lists a draft and a published product.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
insert into public.products (id, seller_id, slug, title, status) values
  ('71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'tee', 'Tee', 'published'),
  ('71000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', 'secret', 'Secret', 'draft');
insert into public.product_variants (product_id, name, price_amount) values
  ('71000000-0000-0000-0000-000000000001', 'M', 2500),
  ('71000000-0000-0000-0000-000000000002', 'One size', 1000);
select throws_ok(
  $$select public.review_seller('70000000-0000-0000-0000-000000000001', 'approved')$$,
  '42501', null, 'sellers cannot call the review function'
);
reset role;

-- Buyer B and anonymous visitors.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select is((select count(*)::int from public.products), 1, 'buyers see only published products');
select is((select count(*)::int from public.product_variants), 1, 'buyers see only public variants');
select is(
  (select count(*)::int from public.products where id = '71000000-0000-0000-0000-000000000001'
     and (select count(*) from public.seller_private) = 0), 1,
  'buyers cannot read seller private data'
);
update public.product_variants set price_amount = 1;
reset role;
select is(
  (select min(price_amount) from public.product_variants), 1000,
  'buyers cannot change prices'
);

-- Suspension hides the shop.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';
select public.review_seller('70000000-0000-0000-0000-000000000001', 'suspended');
reset role;
set local role anon;
select is((select count(*)::int from public.products), 0, 'suspended shops disappear');
reset role;

select * from finish();
rollback;
