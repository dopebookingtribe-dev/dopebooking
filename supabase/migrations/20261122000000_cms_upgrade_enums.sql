-- Admin CMS upgrade, part 1: new enum values. Kept in their own migration
-- because Postgres can't use an enum value in the transaction that adds it.
-- Additive only: nothing existing changes.

-- The media library now holds videos, audio and documents as well as images.
alter type public.media_type add value if not exists 'video';
alter type public.media_type add value if not exists 'audio';
alter type public.media_type add value if not exists 'document';

-- Videos can play a file uploaded to the media library, not only a link.
alter type public.video_provider add value if not exists 'file';
