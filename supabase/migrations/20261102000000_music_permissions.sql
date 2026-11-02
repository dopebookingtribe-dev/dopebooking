-- Phase 11a: permissions for the music marketplace. Kept separate because
-- Postgres can't use new enum values in the same transaction that adds them.
alter type public.app_permission add value if not exists 'music.manage';
alter type public.app_permission add value if not exists 'finance.manage';
