-- Permissions, publication and demo cleanup for the CMS.
-- Run with: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@example.test'),
  ('00000000-0000-0000-0000-0000000000b2', 'staff@example.test'),
  ('00000000-0000-0000-0000-0000000000c3', 'user@example.test');
insert into public.user_roles (user_id, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin'),
  ('00000000-0000-0000-0000-0000000000b2', 'staff');

-- Staff edit drafts but cannot publish.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select lives_ok(
  $$insert into public.site_pages (key, title, draft) values ('home', 'Home', '{"v":1}')$$,
  'staff can save a draft'
);
select throws_ok(
  $$select public.publish_site_page('home')$$,
  '42501', null, 'staff cannot publish'
);
select throws_ok(
  $$update public.site_pages set published = draft where key = 'home'$$,
  '42501', null, 'nobody can write the live version directly'
);
select is((select count(*)::int from public.audit_log), 0, 'staff cannot read the audit log');
reset role;

-- Admin publishes, then edits the draft again.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok($$select public.publish_site_page('home')$$, 'admin can publish');
update public.site_pages set draft = '{"v":2}' where key = 'home';
select ok(
  (select count(*) from public.audit_log where table_name = 'site_pages') >= 2,
  'changes are audited'
);
reset role;

-- Visitors only ever see the published version.
set local role anon;
select is(public.get_published_page('home'), '{"v":1}'::jsonb, 'anon gets the published version');
select throws_ok('select * from public.site_pages', '42501', null, 'anon cannot read drafts');
reset role;

-- Plain users can't create pages, publish or raise their own access.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';
select throws_ok(
  $$insert into public.site_pages (key, title, draft) values ('x', 'X', '{}')$$,
  '42501', null, 'users cannot create pages'
);
select throws_ok(
  $$insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-0000000000c3', 'admin')$$,
  '42501', null, 'users cannot make themselves admin'
);
select throws_ok(
  $$insert into public.role_permissions values ('customer', 'pages.publish')$$,
  '42501', null, 'users cannot widen permissions'
);
reset role;

-- Demo cleanup removes demo records and keeps real ones.
insert into public.artists (slug, stage_name, status, is_demo) values
  ('demo-a', 'Demo A', 'published', true),
  ('real-b', 'Real B', 'published', false);
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select throws_ok($$select public.delete_demo_content()$$, '42501', null, 'staff cannot remove demo content');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select lives_ok($$select public.delete_demo_content()$$, 'admin can remove demo content');
reset role;
select is(
  (select array_agg(slug order by slug)::text from public.artists),
  '{real-b}', 'only real artists remain'
);

select * from finish();
rollback;
